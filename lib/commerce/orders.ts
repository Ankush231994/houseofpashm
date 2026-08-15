import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "../../db";
import {
  adminAuditEntries, inventoryReservations, orderItems, orders, orderStatusEvents,
  paymentAttempts, products, productVariants,
} from "../../db/schema";
import { calculateTotals } from "./money";
import { canOperatorTransition } from "./order-state";
import { createGatewayOrder, createGatewayRefund, paymentMode, verifyPaymentSignature } from "./razorpay";
import type { CheckoutRequest, PricedLine } from "./types";

const RESERVATION_MINUTES = 15;

export async function createCheckoutOrder(request: CheckoutRequest) {
  if (process.env.CATALOG_SOURCE !== "database") throw new Error("Checkout is unavailable until the verified database catalogue is enabled.");
  const db = await getDb();
  await releaseExpiredReservations();
  const skus = request.items.map((item) => item.sku);
  const rows = await db.select({
    sku: productVariants.id, productId: products.id, productName: products.name,
    colour: productVariants.colour, size: productVariants.size, pricePaise: productVariants.pricePaise,
    stock: productVariants.stockQuantity, variantActive: productVariants.active, productStatus: products.status,
  }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(inArray(productVariants.id, skus));
  const bySku = new Map(rows.map((row) => [row.sku, row]));
  const lines: PricedLine[] = request.items.map((item) => {
    const row = bySku.get(item.sku);
    if (!row || !row.variantActive || row.productStatus !== "active") throw new Error(`SKU ${item.sku} is unavailable.`);
    if (row.stock < item.quantity) throw new Error(`Only ${row.stock} unit(s) of ${item.sku} are available.`);
    return { sku: row.sku, productId: row.productId, productName: row.productName, colour: row.colour, size: row.size, imageUrl: null, quantity: item.quantity, unitPricePaise: row.pricePaise, lineTotalPaise: row.pricePaise * item.quantity, availableStock: row.stock };
  });
  if (bySku.size !== skus.length) throw new Error("One or more cart variants no longer exist.");

  const flatShipping = readNonNegativeInteger("SHIPPING_FLAT_RATE_PAISE", paymentMode() === "mock" ? 9900 : null);
  const freeThreshold = readNonNegativeInteger("FREE_SHIPPING_THRESHOLD_PAISE", paymentMode() === "mock" ? 199900 : null);
  const totals = calculateTotals(lines, flatShipping, freeThreshold);
  const id = crypto.randomUUID();
  const orderNumber = createOrderNumber();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresSeconds = nowSeconds + RESERVATION_MINUTES * 60;
  const client = db.$client;
  const statements: D1PreparedStatement[] = [
    client.prepare(`INSERT INTO orders (id,order_number,status,payment_status,customer_name,customer_email,customer_phone,address_line_1,address_line_2,city,state,postal_code,country,subtotal_paise,shipping_paise,tax_paise,total_paise,currency,reservation_expires_at,customer_note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, orderNumber, "pending_payment", "created", request.customer.name, request.customer.email, request.customer.phone, request.customer.addressLine1, request.customer.addressLine2 ?? null, request.customer.city, request.customer.state, request.customer.postalCode, "IN", totals.subtotalPaise, totals.shippingPaise, totals.taxPaise, totals.totalPaise, "INR", expiresSeconds, request.customer.note ?? null, nowSeconds, nowSeconds),
    client.prepare(`INSERT INTO order_status_events (id,order_id,from_status,to_status,actor,note,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, null, "pending_payment", "checkout", "Order created and inventory reserved.", nowSeconds),
  ];
  for (const line of lines) {
    statements.push(client.prepare(`INSERT INTO order_items (id,order_id,product_id,variant_id,sku,product_name,colour,size,image_url,unit_price_paise,quantity,line_total_paise,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, line.productId, line.sku, line.sku, line.productName, line.colour, line.size, line.imageUrl, line.unitPricePaise, line.quantity, line.lineTotalPaise, nowSeconds));
    statements.push(client.prepare(`INSERT INTO inventory_reservations (id,order_id,variant_id,quantity,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), id, line.sku, line.quantity, "active", expiresSeconds, nowSeconds, nowSeconds));
  }
  try {
    await client.batch(statements);
  } catch (error) {
    if (String(error).includes("insufficient_stock")) throw new Error("Stock changed while checking out. Review your bag and try again.");
    throw error;
  }

  try {
    const gateway = await createGatewayOrder({ receipt: orderNumber, amountPaise: totals.totalPaise, notes: { houseofpashm_order_id: id, order_number: orderNumber } });
    await db.update(orders).set({ gatewayOrderId: gateway.id, updatedAt: new Date() }).where(eq(orders.id, id));
    await db.insert(paymentAttempts).values({ id: crypto.randomUUID(), orderId: id, gatewayOrderId: gateway.id, status: "created", amountPaise: totals.totalPaise });
    return { orderId: id, orderNumber, gatewayOrderId: gateway.id, amountPaise: totals.totalPaise, currency: "INR", keyId: gateway.keyId, mockPayment: "mockPayment" in gateway ? gateway.mockPayment : undefined, expiresAt: new Date(expiresSeconds * 1000).toISOString(), totals };
  } catch (error) {
    await releaseOrder(id, "payment_failed", "Gateway order creation failed.");
    throw error;
  }
}

export async function verifyCheckoutPayment(input: { orderId: string; gatewayOrderId: string; paymentId: string; signature: string }) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order || order.gatewayOrderId !== input.gatewayOrderId) throw new Error("Payment does not match this order.");
  const valid = await verifyPaymentSignature(input.gatewayOrderId, input.paymentId, input.signature);
  if (!valid) throw new Error("Payment signature is invalid.");
  const mode = paymentMode();
  const nextStatus = mode === "mock" ? "paid" : "payment_processing";
  const nextPayment = mode === "mock" ? "captured" : "verified";
  const now = new Date();
  await db.update(orders).set({ status: nextStatus, paymentStatus: nextPayment, gatewayPaymentId: input.paymentId, paidAt: mode === "mock" ? now : null, updatedAt: now }).where(eq(orders.id, order.id));
  await db.update(paymentAttempts).set({ gatewayPaymentId: input.paymentId, status: nextPayment, signatureVerified: true, updatedAt: now }).where(and(eq(paymentAttempts.orderId, order.id), eq(paymentAttempts.gatewayOrderId, input.gatewayOrderId)));
  if (mode === "mock") await db.update(inventoryReservations).set({ status: "sold", updatedAt: now }).where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, "active")));
  await db.insert(orderStatusEvents).values({ id: crypto.randomUUID(), orderId: order.id, fromStatus: order.status, toStatus: nextStatus, actor: mode === "mock" ? "mock-rehearsal" : "payment-callback", note: mode === "mock" ? "Mock payment captured for non-production rehearsal." : "Browser callback signature verified; awaiting webhook capture." });
  return { orderNumber: order.orderNumber, status: nextStatus, paymentStatus: nextPayment };
}

export async function retryCheckoutPayment(input: { orderId: string; email: string }) {
  const db = await getDb();
  await releaseExpiredReservations();
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order || order.customerEmail !== input.email.trim().toLowerCase()) throw new Error("Order could not be found.");
  if (!["pending_payment", "payment_failed"].includes(order.status) || order.reservationExpiresAt <= new Date()) throw new Error("This payment can no longer be retried. Rebuild the cart to check current stock.");
  const gateway = await createGatewayOrder({ receipt: order.orderNumber, amountPaise: order.totalPaise, notes: { houseofpashm_order_id: order.id, order_number: order.orderNumber, retry: "true" } });
  await db.update(orders).set({ status: "pending_payment", paymentStatus: "created", gatewayOrderId: gateway.id, updatedAt: new Date() }).where(eq(orders.id, order.id));
  await db.insert(paymentAttempts).values({ id: crypto.randomUUID(), orderId: order.id, gatewayOrderId: gateway.id, status: "created", amountPaise: order.totalPaise });
  await db.insert(orderStatusEvents).values({ id: crypto.randomUUID(), orderId: order.id, fromStatus: order.status, toStatus: "pending_payment", actor: "checkout", note: "Customer requested a payment retry." });
  return { orderId: order.id, orderNumber: order.orderNumber, gatewayOrderId: gateway.id, amountPaise: order.totalPaise, currency: "INR", keyId: gateway.keyId, mockPayment: "mockPayment" in gateway ? gateway.mockPayment : undefined, expiresAt: order.reservationExpiresAt.toISOString() };
}

export async function releaseExpiredReservations() {
  const db = await getDb();
  const now = new Date();
  const expired = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.status, "pending_payment"), eq(orders.paymentStatus, "created"), lte(orders.reservationExpiresAt, now)));
  for (const order of expired) await releaseOrder(order.id, "expired", "Payment window expired.");
}

export async function releaseOrder(orderId: string, status: "cancelled" | "expired" | "payment_failed", note: string) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || ["paid", "packing", "shipped", "delivered", "refund_pending", "refunded"].includes(order.status)) return;
  const now = new Date();
  await db.update(inventoryReservations).set({ status: "released", updatedAt: now }).where(and(eq(inventoryReservations.orderId, orderId), eq(inventoryReservations.status, "active")));
  await db.update(orders).set({ status, paymentStatus: status === "payment_failed" ? "failed" : order.paymentStatus, cancelledAt: status === "cancelled" ? now : null, updatedAt: now }).where(eq(orders.id, orderId));
  await db.insert(orderStatusEvents).values({ id: crypto.randomUUID(), orderId, fromStatus: order.status, toStatus: status, actor: "system", note });
}

export async function listOrdersForAdmin() {
  const db = await getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  return Promise.all(rows.map(async (order) => ({ ...order, items: await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.createdAt)) })));
}

export async function trackOrder(orderNumber: string, email: string) {
  const db = await getDb();
  const [order] = await db.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status, paymentStatus: orders.paymentStatus, trackingProvider: orders.trackingProvider, trackingNumber: orders.trackingNumber, trackingUrl: orders.trackingUrl, createdAt: orders.createdAt, shippedAt: orders.shippedAt, deliveredAt: orders.deliveredAt }).from(orders).where(and(eq(orders.orderNumber, orderNumber.trim().toUpperCase()), eq(orders.customerEmail, email.trim().toLowerCase()))).limit(1);
  if (!order) throw new Error("No order matched that order number and email.");
  const items = await db.select({ name: orderItems.productName, sku: orderItems.sku, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function updateOrderByAdmin(orderId: string, action: string, input: { provider?: string; trackingNumber?: string; trackingUrl?: string; note?: string }, actorEmail: string) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found.");
  if (!canOperatorTransition(order.status, action)) throw new Error(`Cannot move ${order.status} to ${action}.`);
  if (action === "shipped" && (!input.provider?.trim() || !input.trackingNumber?.trim())) throw new Error("Courier and tracking number are required before shipping.");
  let finalAction = action;
  if (action === "refund_pending") {
    if (!order.gatewayPaymentId) throw new Error("A captured payment ID is required to request a refund.");
    const refund = await createGatewayRefund(order.gatewayPaymentId, order.totalPaise, order.orderNumber);
    if (paymentMode() === "mock" && refund.status === "processed") finalAction = "refunded";
  }
  const now = new Date();
  await db.update(orders).set({ status: finalAction as typeof order.status, trackingProvider: input.provider?.trim() || order.trackingProvider, trackingNumber: input.trackingNumber?.trim() || order.trackingNumber, trackingUrl: safeTrackingUrl(input.trackingUrl) ?? order.trackingUrl, operatorNote: input.note?.trim().slice(0, 500) || order.operatorNote, shippedAt: finalAction === "shipped" ? now : order.shippedAt, deliveredAt: finalAction === "delivered" ? now : order.deliveredAt, paymentStatus: finalAction === "refund_pending" ? "refund_pending" : finalAction === "refunded" ? "refunded" : order.paymentStatus, updatedAt: now }).where(eq(orders.id, orderId));
  await db.insert(orderStatusEvents).values({ id: crypto.randomUUID(), orderId, fromStatus: order.status, toStatus: finalAction, actor: actorEmail, note: input.note?.trim().slice(0, 500) });
  await db.insert(adminAuditEntries).values({ id: crypto.randomUUID(), actorEmail, action: `order.${finalAction}`, entityType: "order", entityId: orderId, summary: `Changed ${order.orderNumber} from ${order.status} to ${finalAction}.` });
  if (["shipped", "delivered", "refunded"].includes(finalAction)) await import("./email").then(({ sendOrderEmail }) => sendOrderEmail(orderId, finalAction as "shipped" | "delivered" | "refunded")).catch(() => undefined);
  return { orderNumber: order.orderNumber, status: finalAction };
}

function readNonNegativeInteger(name: string, fallback: number | null) {
  const value = process.env[name];
  if (!value && fallback !== null) return fallback;
  if (!value || !/^\d+$/.test(value)) throw new Error(`${name} must be configured as non-negative paise.`);
  return Number(value);
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `HOP-${date}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function safeTrackingUrl(value?: string) {
  if (!value?.trim()) return null;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Tracking URL must use HTTPS.");
  return url.toString();
}

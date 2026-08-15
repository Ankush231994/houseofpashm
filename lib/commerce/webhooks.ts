import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { orders, paymentAttempts } from "../../db/schema";
import { sha256Hex, verifyWebhookSignature } from "./razorpay";
import { sendOrderEmail } from "./email";

type RazorpayPayment = { id?: string; order_id?: string; amount?: number; error_code?: string; error_description?: string };
type RazorpayRefund = { id?: string; payment_id?: string; amount?: number };

export async function processRazorpayWebhook(rawBody: string, signature: string, suppliedEventId?: string | null) {
  if (!await verifyWebhookSignature(rawBody, signature)) throw new Error("Invalid webhook signature.");
  const payload = JSON.parse(rawBody) as { event?: string; created_at?: number; payload?: { payment?: { entity?: RazorpayPayment }; refund?: { entity?: RazorpayRefund } } };
  const eventType = payload.event ?? "unknown";
  const payment = payload.payload?.payment?.entity;
  const refund = payload.payload?.refund?.entity;
  const gatewayOrderId = payment?.order_id;
  const payloadHash = await sha256Hex(rawBody);
  const eventId = suppliedEventId?.trim() || `${eventType}:${payment?.id ?? refund?.id ?? payloadHash}:${payload.created_at ?? 0}`;
  const db = await getDb();
  if (eventType === "refund.processed" && refund?.payment_id) {
    const [refundAttempt] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.gatewayPaymentId, refund.payment_id)).limit(1);
    if (!refundAttempt) return recordIgnored(db.$client, eventId, eventType, payloadHash, "Refund payment is not recognised.");
    const [refundOrder] = await db.select().from(orders).where(eq(orders.id, refundAttempt.orderId)).limit(1);
    if (!refundOrder || refund.amount !== refundOrder.totalPaise) throw new Error("Refund amount does not match the order total.");
    const refundNow = Math.floor(Date.now() / 1000);
    try {
      await db.$client.batch([
        db.$client.prepare(`INSERT INTO webhook_events (id,event_type,payload_hash,status,created_at,processed_at) VALUES (?,?,?,?,?,?)`).bind(eventId, eventType, payloadHash, "processed", refundNow, refundNow),
        db.$client.prepare(`UPDATE orders SET status='refunded',payment_status='refunded',updated_at=? WHERE id=?`).bind(refundNow, refundOrder.id),
        db.$client.prepare(`UPDATE payment_attempts SET status='refunded',updated_at=? WHERE id=?`).bind(refundNow, refundAttempt.id),
        db.$client.prepare(`INSERT INTO order_status_events (id,order_id,from_status,to_status,actor,note,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), refundOrder.id, refundOrder.status, "refunded", "razorpay-webhook", "Verified refund.processed webhook.", refundNow),
      ]);
    } catch (error) { if (String(error).toLowerCase().includes("unique")) return { duplicate: true, eventId }; throw error; }
    await sendOrderEmail(refundOrder.id, "refunded").catch(() => undefined);
    return { duplicate: false, eventId, eventType };
  }
  if (!gatewayOrderId) return recordIgnored(db.$client, eventId, eventType, payloadHash, "Webhook does not contain a payment order ID.");
  const [attempt] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.gatewayOrderId, gatewayOrderId)).limit(1);
  if (!attempt) return recordIgnored(db.$client, eventId, eventType, payloadHash, "Gateway order is not recognised.");
  const [order] = await db.select().from(orders).where(eq(orders.id, attempt.orderId)).limit(1);
  if (!order) throw new Error("Webhook references a missing order.");
  const now = Math.floor(Date.now() / 1000);
  const client = db.$client;
  const eventInsert = client.prepare(`INSERT INTO webhook_events (id,event_type,payload_hash,status,created_at,processed_at) VALUES (?,?,?,?,?,?)`).bind(eventId, eventType, payloadHash, "processed", now, now);
  const statements: D1PreparedStatement[] = [eventInsert];
  if (eventType === "payment.captured") {
    if (payment?.amount !== order.totalPaise) throw new Error("Captured amount does not match the server order total.");
    statements.push(
      client.prepare(`UPDATE orders SET status='paid',payment_status='captured',gateway_payment_id=?,paid_at=?,updated_at=? WHERE id=? AND payment_status!='captured'`).bind(payment.id ?? null, now, now, order.id),
      client.prepare(`UPDATE payment_attempts SET status='captured',gateway_payment_id=?,signature_verified=1,updated_at=? WHERE id=?`).bind(payment.id ?? null, now, attempt.id),
      client.prepare(`UPDATE inventory_reservations SET status='sold',updated_at=? WHERE order_id=? AND status='active'`).bind(now, order.id),
      client.prepare(`INSERT INTO order_status_events (id,order_id,from_status,to_status,actor,note,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), order.id, order.status, "paid", "razorpay-webhook", "Verified payment.captured webhook.", now),
    );
  } else if (eventType === "payment.failed") {
    statements.push(
      client.prepare(`UPDATE orders SET status='payment_failed',payment_status='failed',updated_at=? WHERE id=? AND payment_status!='captured'`).bind(now, order.id),
      client.prepare(`UPDATE payment_attempts SET status='failed',gateway_payment_id=?,error_code=?,error_description=?,updated_at=? WHERE id=?`).bind(payment?.id ?? null, payment?.error_code?.slice(0, 100) ?? null, payment?.error_description?.slice(0, 500) ?? null, now, attempt.id),
      client.prepare(`INSERT INTO order_status_events (id,order_id,from_status,to_status,actor,note,created_at) VALUES (?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), order.id, order.status, "payment_failed", "razorpay-webhook", "Verified payment.failed webhook; reservation remains available for retry until expiry.", now),
    );
  } else {
    statements[0] = client.prepare(`INSERT INTO webhook_events (id,event_type,payload_hash,status,created_at,processed_at) VALUES (?,?,?,?,?,?)`).bind(eventId, eventType, payloadHash, "ignored", now, now);
  }
  try {
    await client.batch(statements);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return { duplicate: true, eventId };
    throw error;
  }
  if (eventType === "payment.captured") await sendOrderEmail(order.id, "paid").catch(() => undefined);
  return { duplicate: false, eventId, eventType };
}

async function recordIgnored(client: D1Database, id: string, type: string, hash: string, message: string) {
  try {
    await client.prepare(`INSERT INTO webhook_events (id,event_type,payload_hash,status,error_message,created_at,processed_at) VALUES (?,?,?,?,?,?,?)`).bind(id, type, hash, "ignored", message, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return { duplicate: true, eventId: id };
    throw error;
  }
  return { duplicate: false, eventId: id, ignored: true };
}

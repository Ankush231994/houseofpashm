import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { calculateTotals } from "../lib/commerce/money.ts";
import { canOperatorTransition } from "../lib/commerce/order-state.ts";
import { createGatewayOrder, verifyPaymentSignature, verifyWebhookSignature } from "../lib/commerce/razorpay.ts";
import { parseCheckoutRequest } from "../lib/commerce/validation.ts";

const validCustomer = { name: "Test Customer", email: "customer@example.com", phone: "9876543210", addressLine1: "12 Test Road", city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN" };

test("guest checkout validates Indian delivery details and cart quantities", () => {
  const valid = parseCheckoutRequest({ items: [{ sku: "HOP-KUR-001", quantity: 2 }], customer: validCustomer });
  assert.equal(valid.issues.length, 0); assert.ok(valid.request);
  const invalid = parseCheckoutRequest({ items: [{ sku: "HOP-KUR-001", quantity: 11 }], customer: { ...validCustomer, phone: "123", postalCode: "000000", state: "Unknown" } });
  assert.equal(invalid.request, null);
  assert.ok(invalid.issues.some((issue) => issue.field === "customer.phone"));
  assert.ok(invalid.issues.some((issue) => issue.field === "customer.postalCode"));
  assert.ok(invalid.issues.some((issue) => issue.field === "items.0.quantity"));
});

test("server totals apply configured shipping and ignore display prices", () => {
  const line = { sku: "HOP-KUR-001", productId: "p1", productName: "Kurti", colour: null, size: null, imageUrl: null, quantity: 2, unitPricePaise: 100_00, lineTotalPaise: 200_00, availableStock: 5 };
  assert.deepEqual(calculateTotals([line], 99_00, 1_999_00), { subtotalPaise: 200_00, shippingPaise: 99_00, taxPaise: 0, totalPaise: 299_00, currency: "INR" });
  assert.equal(calculateTotals([{ ...line, lineTotalPaise: 2_000_00 }], 99_00, 1_999_00).shippingPaise, 0);
});

test("operators cannot skip fulfilment or manually claim a completed refund", () => {
  assert.equal(canOperatorTransition("paid", "packing"), true);
  assert.equal(canOperatorTransition("paid", "shipped"), false);
  assert.equal(canOperatorTransition("refund_pending", "refunded"), false);
  assert.equal(canOperatorTransition("delivered", "refund_pending"), true);
});

test("mock Razorpay flow signs and verifies the server order and payment IDs", async () => {
  const previousMode = process.env.RAZORPAY_MODE; const previousSecret = process.env.RAZORPAY_KEY_SECRET; const previousNodeEnv = process.env.NODE_ENV; const previousAppEnv = process.env.APP_ENV; const previousMock = process.env.ALLOW_MOCK_PAYMENTS;
  process.env.RAZORPAY_MODE = "mock"; process.env.RAZORPAY_KEY_SECRET = "test-secret-at-least-32-characters"; process.env.APP_ENV = "local"; process.env.ALLOW_MOCK_PAYMENTS = "true"; Reflect.set(process.env, "NODE_ENV", "test");
  try {
    const gateway = await createGatewayOrder({ receipt: "HOP-TEST", amountPaise: 123_00, notes: {} });
    assert.ok(gateway.mockPayment);
    assert.equal(await verifyPaymentSignature(gateway.id, gateway.mockPayment!.paymentId, gateway.mockPayment!.signature), true);
    assert.equal(await verifyPaymentSignature(gateway.id, gateway.mockPayment!.paymentId, "0".repeat(64)), false);
  } finally {
    restore("RAZORPAY_MODE", previousMode); restore("RAZORPAY_KEY_SECRET", previousSecret); restore("APP_ENV", previousAppEnv); restore("ALLOW_MOCK_PAYMENTS", previousMock); if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  }
});

test("Razorpay webhook verification signs the unmodified raw body", async () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET; const secret = "webhook-secret-at-least-32-characters"; process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  try {
    const body = '{"event":"payment.captured","amount":10000}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    assert.equal(await verifyWebhookSignature(body, signature), true);
    assert.equal(await verifyWebhookSignature(`${body}\n`, signature), false);
  } finally { restore("RAZORPAY_WEBHOOK_SECRET", previous); }
});

test("D1 migrations reserve stock atomically and release it exactly once", async () => {
  const database = new DatabaseSync(":memory:"); database.exec("PRAGMA foreign_keys=ON;");
  const [first, second] = await Promise.all([readFile(new URL("../drizzle/0000_absent_bloodstrike.sql", import.meta.url), "utf8"), readFile(new URL("../drizzle/0001_boring_frog_thor.sql", import.meta.url), "utf8")]);
  database.exec(first.replaceAll("--> statement-breakpoint", "")); database.exec(second.replaceAll("--> statement-breakpoint", ""));
  database.exec(`INSERT INTO products (id,name,status,category,operator_verified) VALUES ('p1','Test Product','active','Kurtis',1); INSERT INTO product_variants (id,product_id,price_paise,mrp_paise,stock_quantity,active) VALUES ('HOP-TST-001','p1',10000,12000,3,1); INSERT INTO orders (id,order_number,customer_name,customer_email,customer_phone,address_line_1,city,state,postal_code,subtotal_paise,shipping_paise,tax_paise,total_paise,reservation_expires_at) VALUES ('o1','HOP-TEST-1','Test','test@example.com','9876543210','Road','Pune','Maharashtra','411001',20000,0,0,20000,unixepoch()+900); INSERT INTO inventory_reservations (id,order_id,variant_id,quantity,status,expires_at) VALUES ('r1','o1','HOP-TST-001',2,'active',unixepoch()+900);`);
  assert.equal((database.prepare("SELECT stock_quantity AS stock FROM product_variants WHERE id=?").get("HOP-TST-001") as { stock: number }).stock, 1);
  assert.throws(() => database.exec(`INSERT INTO orders (id,order_number,customer_name,customer_email,customer_phone,address_line_1,city,state,postal_code,subtotal_paise,shipping_paise,tax_paise,total_paise,reservation_expires_at) VALUES ('o2','HOP-TEST-2','Test','test@example.com','9876543210','Road','Pune','Maharashtra','411001',20000,0,0,20000,unixepoch()+900); INSERT INTO inventory_reservations (id,order_id,variant_id,quantity,status,expires_at) VALUES ('r2','o2','HOP-TST-001',2,'active',unixepoch()+900);`), /insufficient_stock/);
  database.exec("UPDATE inventory_reservations SET status='released' WHERE id='r1';");
  assert.equal((database.prepare("SELECT stock_quantity AS stock FROM product_variants WHERE id=?").get("HOP-TST-001") as { stock: number }).stock, 3);
  database.exec("UPDATE inventory_reservations SET status='released' WHERE id='r1';");
  assert.equal((database.prepare("SELECT stock_quantity AS stock FROM product_variants WHERE id=?").get("HOP-TST-001") as { stock: number }).stock, 3);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM inventory_movements WHERE variant_id=?").get("HOP-TST-001") as { count: number }).count, 2);
  database.close();
});

function restore(name: string, value: string | undefined) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }

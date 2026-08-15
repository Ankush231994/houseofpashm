function requiredSecret(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function paymentMode() {
  const mode = process.env.RAZORPAY_MODE ?? "disabled";
  if (mode === "mock" && (process.env.ALLOW_MOCK_PAYMENTS !== "true" || !["local", "staging"].includes(process.env.APP_ENV ?? ""))) throw new Error("Mock payments require an explicit local or staging rehearsal configuration.");
  if (mode !== "mock" && mode !== "test" && mode !== "live") throw new Error("Razorpay checkout is not configured.");
  return mode;
}

export async function createGatewayOrder(input: { receipt: string; amountPaise: number; notes: Record<string, string> }) {
  const mode = paymentMode();
  if (mode === "mock") {
    const id = `order_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const paymentId = `pay_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const signature = await hmacHex(`${id}|${paymentId}`, requiredSecret("RAZORPAY_KEY_SECRET"));
    return { id, amount: input.amountPaise, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID ?? "rzp_test_mock", mockPayment: { paymentId, signature } };
  }
  const keyId = requiredSecret("RAZORPAY_KEY_ID");
  const secret = requiredSecret("RAZORPAY_KEY_SECRET");
  if (mode === "test" && !keyId.startsWith("rzp_test_")) throw new Error("Test mode requires an rzp_test_ key.");
  if (mode === "live" && !keyId.startsWith("rzp_live_")) throw new Error("Live mode requires an rzp_live_ key.");
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { authorization: `Basic ${btoa(`${keyId}:${secret}`)}`, "content-type": "application/json" }, body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes }) });
  if (!response.ok) throw new Error(`Razorpay order creation failed (${response.status}).`);
  const order = await response.json() as { id: string; amount: number; currency: string };
  if (order.amount !== input.amountPaise || order.currency !== "INR") throw new Error("Razorpay returned unexpected order totals.");
  return { ...order, keyId };
}

export async function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = await hmacHex(`${orderId}|${paymentId}`, requiredSecret("RAZORPAY_KEY_SECRET"));
  return timingSafeEqualHex(expected, signature);
}

export async function verifyWebhookSignature(body: string, signature: string) {
  const expected = await hmacHex(body, requiredSecret("RAZORPAY_WEBHOOK_SECRET"));
  return timingSafeEqualHex(expected, signature);
}

export async function createGatewayRefund(paymentId: string, amountPaise: number, orderNumber: string) {
  const mode = paymentMode();
  if (mode === "mock") return { id: `rfnd_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`, status: "processed" as const };
  const keyId = requiredSecret("RAZORPAY_KEY_ID"); const secret = requiredSecret("RAZORPAY_KEY_SECRET");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", headers: { authorization: `Basic ${btoa(`${keyId}:${secret}`)}`, "content-type": "application/json", "x-idempotency-key": `refund-${orderNumber}` }, body: JSON.stringify({ amount: amountPaise, notes: { order_number: orderNumber } }) });
  if (!response.ok) throw new Error(`Razorpay refund request failed (${response.status}).`);
  return response.json() as Promise<{ id: string; status: string }>;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function timingSafeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

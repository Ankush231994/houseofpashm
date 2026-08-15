import { verifyCheckoutPayment } from "../../../../lib/commerce/orders";
import { assertSameOrigin, readLimitedJson } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await readLimitedJson(request, 8_000) as Record<string, unknown>;
    const input = { orderId: string(payload.orderId), gatewayOrderId: string(payload.razorpay_order_id), paymentId: string(payload.razorpay_payment_id), signature: string(payload.razorpay_signature) };
    if (Object.values(input).some((value) => !value)) return Response.json({ error: "Complete payment verification details are required." }, { status: 400 });
    return Response.json(await verifyCheckoutPayment(input));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Payment verification failed." }, { status: 400 });
  }
}

function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

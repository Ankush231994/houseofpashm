import { retryCheckoutPayment } from "../../../../lib/commerce/orders";
import { assertSameOrigin, readLimitedJson } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await readLimitedJson(request, 4_000) as { orderId?: unknown; email?: unknown };
    if (typeof payload.orderId !== "string" || typeof payload.email !== "string") return Response.json({ error: "Order ID and email are required." }, { status: 400 });
    return Response.json(await retryCheckoutPayment({ orderId: payload.orderId, email: payload.email }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Payment retry failed." }, { status: 409 });
  }
}

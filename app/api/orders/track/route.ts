import { trackOrder } from "../../../../lib/commerce/orders";
import { assertSameOrigin, readLimitedJson } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readLimitedJson(request, 4_000) as Record<string, unknown>;
    if (typeof body.orderNumber !== "string" || typeof body.email !== "string") return Response.json({ error: "Order number and email are required." }, { status: 400 });
    return Response.json(await trackOrder(body.orderNumber, body.email));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Order lookup failed." }, { status: 404 }); }
}

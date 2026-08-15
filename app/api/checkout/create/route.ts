import { createCheckoutOrder } from "../../../../lib/commerce/orders";
import { parseCheckoutRequest } from "../../../../lib/commerce/validation";
import { assertSameOrigin, readLimitedJson } from "../../../../lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await readLimitedJson(request);
    const parsed = parseCheckoutRequest(payload);
    if (!parsed.request) return Response.json({ error: "Checkout details need attention.", issues: parsed.issues }, { status: 422 });
    return Response.json(await createCheckoutOrder(parsed.request), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be started.";
    const status = /unavailable|configured/.test(message) ? 503 : /stock|SKU|variant/.test(message) ? 409 : /origin|large|JSON/.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}

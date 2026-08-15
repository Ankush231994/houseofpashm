import { getAdminAccess } from "../../../../../lib/admin-auth";
import { updateOrderByAdmin } from "../../../../../lib/commerce/orders";
import { assertSameOrigin, readLimitedJson } from "../../../../../lib/http";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  const access = await getAdminAccess(request.headers);
  if (!access.allowed) return Response.json({ error: access.reason }, { status: access.configured ? 403 : 503 });
  try {
    const { id } = await context.params;
    const payload = await readLimitedJson(request, 8_000) as Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action : "";
    if (!action) return Response.json({ error: "Order action is required." }, { status: 400 });
    const input = { provider: text(payload.provider), trackingNumber: text(payload.trackingNumber), trackingUrl: text(payload.trackingUrl), note: text(payload.note) };
    return Response.json(await updateOrderByAdmin(id, action, input, access.email));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order update failed." }, { status: 409 });
  }
}

function text(value: unknown) { return typeof value === "string" ? value : undefined; }

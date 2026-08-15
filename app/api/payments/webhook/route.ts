import { processRazorpayWebhook } from "../../../../lib/commerce/webhooks";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 1_000_000) return Response.json({ error: "Payload too large." }, { status: 413 });
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!signature) return Response.json({ error: "Webhook signature is required." }, { status: 400 });
    const result = await processRazorpayWebhook(body, signature, request.headers.get("x-razorpay-event-id"));
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return Response.json({ error: message }, { status: message.includes("signature") ? 401 : 500 });
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : new URL(request.url).origin;
  if (!origin && process.env.APP_ENV === "local") return;
  if (!origin || origin !== expected) throw new Error("Request origin is not allowed.");
}

export async function readLimitedJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("Request is too large.");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("Request is too large.");
  return JSON.parse(body) as unknown;
}

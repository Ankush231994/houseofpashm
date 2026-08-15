export type AdminAccess =
  | { allowed: true; email: string; mode: string }
  | { allowed: false; configured: boolean; reason: string };

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function getAdminAccess(headers: Headers): Promise<AdminAccess> {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedEmails.length) {
    return {
      allowed: false,
      configured: false,
      reason: "ADMIN_EMAILS is not configured.",
    };
  }

  const mode = process.env.ADMIN_AUTH_MODE ?? "cloudflare-access";
  let email: string | null = null;
  if (mode === "cloudflare-access") {
    const token = headers.get("cf-access-jwt-assertion");
    const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
    const audience = process.env.CLOUDFLARE_ACCESS_AUD;
    if (!token || !teamDomain || !audience) {
      return {
        allowed: false,
        configured: Boolean(teamDomain && audience),
        reason: "Cloudflare Access JWT, team domain and audience are required.",
      };
    }
    try {
      const url = new URL(`${teamDomain}/cdn-cgi/access/certs`);
      const jwks = jwksByUrl.get(url.href) ?? createRemoteJWKSet(url);
      jwksByUrl.set(url.href, jwks);
      const { payload } = await jwtVerify(token, jwks, { issuer: teamDomain, audience });
      email = typeof payload.email === "string" ? payload.email : null;
    } catch {
      return { allowed: false, configured: true, reason: "Cloudflare Access token validation failed." };
    }
  } else if (mode === "chatgpt" && process.env.APP_ENV !== "production") {
    email = headers.get("oai-authenticated-user-email");
  } else if (mode === "local" && process.env.APP_ENV === "local") {
    email = headers.get("x-houseofpashm-admin-email") ?? allowedEmails[0];
  } else {
    return {
      allowed: false,
      configured: true,
      reason: "ADMIN_AUTH_MODE is invalid or unsafe for this environment.",
    };
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !allowedEmails.includes(normalizedEmail)) {
    return {
      allowed: false,
      configured: true,
      reason: "This email is not allowed to access catalogue administration.",
    };
  }
  return { allowed: true, email: normalizedEmail, mode };
}
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AdminAccess =
  | { allowed: true; email: string; mode: string }
  | { allowed: false; configured: boolean; reason: string };

export function getAdminAccess(headers: Headers): AdminAccess {
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
    if (!headers.get("cf-access-jwt-assertion")) {
      return {
        allowed: false,
        configured: true,
        reason: "Cloudflare Access authentication is required.",
      };
    }
    email = headers.get("cf-access-authenticated-user-email");
  } else if (mode === "chatgpt") {
    email = headers.get("oai-authenticated-user-email");
  } else if (mode === "local" && process.env.NODE_ENV !== "production") {
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

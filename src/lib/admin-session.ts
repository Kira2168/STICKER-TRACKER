import crypto from "crypto";

const ADMIN_COOKIE_NAME = "admin_session";
const FALLBACK_ADMIN_JWT_SECRET = "sticker-tracker-admin-jwt-secret";

type AdminSessionPayload = {
  sub: "admin";
  exp: number; // unix seconds
  iat: number; // unix seconds
};

function base64UrlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecodeToString(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + "=".repeat(padLength);
  return Buffer.from(withPadding, "base64").toString("utf8");
}

function sign(payloadB64: string, secret: string) {
  const digest = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return base64UrlEncode(digest);
}

export function getAdminJwtSecret() {
  return process.env.ADMIN_JWT_SECRET?.trim() || FALLBACK_ADMIN_JWT_SECRET;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function createAdminSessionToken(options?: { expiresInSeconds?: number }) {
  const secret = getAdminJwtSecret();

  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = options?.expiresInSeconds ?? 60 * 60 * 24 * 7; // 7 days

  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigB64 = sign(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

export function verifyAdminSessionToken(token: string) {
  const secret = getAdminJwtSecret();

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return { ok: false as const, reason: "malformed" as const };

  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);

  if (a.length !== b.length) return { ok: false as const, reason: "bad_sig" as const };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false as const, reason: "bad_sig" as const };

  try {
    const decoded = base64UrlDecodeToString(payloadB64);
    const payload = JSON.parse(decoded) as Partial<AdminSessionPayload>;

    if (payload.sub !== "admin") return { ok: false as const, reason: "bad_payload" as const };
    if (typeof payload.exp !== "number") return { ok: false as const, reason: "bad_payload" as const };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return { ok: false as const, reason: "expired" as const };

    return { ok: true as const, payload: payload as AdminSessionPayload };
  } catch {
    return { ok: false as const, reason: "bad_payload" as const };
  }
}

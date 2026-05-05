import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createAdminSessionToken,
  getAdminCookieName,
} from "../../../../lib/admin-session";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeEnvCredential(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function resolveAdminCredential(envValue: string | undefined, fallback: string) {
  return normalizeEnvCredential(envValue) || fallback;
}

export async function POST(req: Request) {
  const adminId = resolveAdminCredential(process.env.ADMIN_LOGIN_ID, "beka");
  const adminPassword = resolveAdminCredential(process.env.ADMIN_LOGIN_PASSWORD, "bekas123");

  try {
    const body = (await req.json()) as { id?: string; password?: string };
    const id = (body.id || "").trim();
    const password = body.password || "";

    if (!id || !password) return jsonError("Missing id or password", 400);

    if (id.toLowerCase() !== adminId.toLowerCase() || password !== adminPassword) {
      return jsonError("Invalid credentials", 401);
    }

    const token = createAdminSessionToken({ expiresInSeconds: 60 * 60 * 24 * 7 });

    (await cookies()).set({
      name: getAdminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return jsonError(err instanceof Error ? err.message : String(err), 500);
  }
}

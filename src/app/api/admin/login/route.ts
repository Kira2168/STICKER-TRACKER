import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createAdminSessionToken,
  getAdminCookieName,
} from "../../../../lib/admin-session";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const adminId = process.env.ADMIN_LOGIN_ID || null;
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || null;

  if (!adminId) return jsonError("Missing ADMIN_LOGIN_ID env var", 500);
  if (!adminPassword) return jsonError("Missing ADMIN_LOGIN_PASSWORD env var", 500);
  if (!process.env.ADMIN_JWT_SECRET) return jsonError("Missing ADMIN_JWT_SECRET env var", 500);

  try {
    const body = (await req.json()) as { id?: string; password?: string };
    const id = (body.id || "").trim();
    const password = body.password || "";

    if (!id || !password) return jsonError("Missing id or password", 400);

    if (id !== adminId || password !== adminPassword) {
      return jsonError("Invalid credentials", 401);
    }

    const token = createAdminSessionToken({ expiresInSeconds: 60 * 60 * 24 * 7 });

    cookies().set({
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

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminCookieName } from "../../../../lib/admin-session";

export async function POST() {
  cookies().set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const login = String(body.login || "").trim();
  const password = String(body.password || "");

  const user = db
    .prepare("SELECT id, login, password_hash, name, role FROM users WHERE login = ?")
    .get(login) as { id: string; login: string; password_hash: string; name: string; role: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const token = createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}

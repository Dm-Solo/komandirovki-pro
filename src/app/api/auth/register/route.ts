import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const login = String(body.login || "").trim();
  const name = String(body.name || "").trim() || login;
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!login || !password) {
    return NextResponse.json({ error: "Заполните логин и пароль" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Пароли не совпадают" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE login = ?").get(login);
  if (existing) {
    return NextResponse.json({ error: "Такой логин уже занят" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, login, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(id, login, passwordHash, name, "Сотрудник");

  const token = createSession(id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}

import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "./db";

const COOKIE_NAME = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type User = {
  id: string;
  login: string;
  name: string;
  role: string;
};

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
  return token;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").get(
    token
  ) as { user_id: string; expires_at: number } | undefined;
  if (!session || session.expires_at < Date.now()) return null;

  const user = db.prepare("SELECT id, login, name, role FROM users WHERE id = ?").get(
    session.user_id
  ) as User | undefined;
  return user ?? null;
}

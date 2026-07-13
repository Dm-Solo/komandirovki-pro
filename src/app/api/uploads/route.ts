import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { db, UPLOADS_DIR } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "attachment");
  const fileType = String(form.get("fileType") || "ticket");
  const duration = form.get("duration") ? Number(form.get("duration")) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Zа-яА-Я0-9._-]+/g, "_");
  const relPath = path.join(user.id, `${id}-${safeName}`);
  const absPath = path.join(UPLOADS_DIR, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absPath, buffer);

  db.prepare(
    `INSERT INTO uploads (id, user_id, report_id, kind, name, size, file_type, path, duration, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, user.id, kind, file.name, buffer.length, kind === "attachment" ? fileType : null, relPath, duration, Date.now());

  return NextResponse.json({
    id,
    name: file.name,
    size: buffer.length,
    fileType: kind === "attachment" ? fileType : null,
    duration,
  });
}

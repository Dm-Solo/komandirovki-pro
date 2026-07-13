import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { getUploadForUser } from "@/lib/data";
import { UPLOADS_DIR } from "@/lib/db";

const MIME_TYPES: Record<string, string> = {
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await params;
  const upload = getUploadForUser(user.id, id);
  if (!upload) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const absPath = path.join(UPLOADS_DIR, upload.path);
  if (!fs.existsSync(absPath)) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });

  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(upload.path).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(upload.name)}"`,
      "Cache-Control": "private, max-age=31536000",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUpload, updateAttachmentType } from "@/lib/data";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const ok = updateAttachmentType(user.id, id, String(body.fileType || "other"));
  if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const ok = deleteUpload(user.id, id);
  if (!ok) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

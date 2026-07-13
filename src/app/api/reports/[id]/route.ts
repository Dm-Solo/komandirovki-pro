import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteReport, getReport } from "@/lib/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const report = getReport(user.id, id);
  if (!report) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ report });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const ok = deleteReport(user.id, id);
  if (!ok) return NextResponse.json({ error: "Нельзя удалить этот отчёт" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

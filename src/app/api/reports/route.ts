import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReport, listReports, setReportBitrixItemId } from "@/lib/data";
import { syncReportToBitrix } from "@/lib/bitrix";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  return NextResponse.json({ reports: listReports(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json();
  const report = createReport(user.id, {
    destination: String(body.destination || ""),
    purpose: String(body.purpose || "other"),
    startDate: String(body.startDate || ""),
    endDate: String(body.endDate || ""),
    comment: String(body.comment || ""),
    receipts: Array.isArray(body.receipts) ? body.receipts : [],
    attachmentIds: Array.isArray(body.attachmentIds) ? body.attachmentIds : [],
    voiceNoteUploadId: body.voiceNoteUploadId || null,
    aiSummary: body.aiSummary || null,
  });

  const bitrixItemId = await syncReportToBitrix(report);
  if (bitrixItemId) setReportBitrixItemId(report.id, bitrixItemId);

  return NextResponse.json({ report });
}

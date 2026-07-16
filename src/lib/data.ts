import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db, UPLOADS_DIR } from "./db";
import { mmss } from "./format";
import type { ApprovalStep, Attachment, Receipt, Report, Trip, VoiceNote } from "./types";

type ReportRow = {
  id: string;
  user_id: string;
  trip_id: string | null;
  title: string;
  destination: string;
  purpose: string;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  status: string;
  comment: string | null;
  ai_summary: string | null;
  voice_transcript: string | null;
  approval_steps: string;
  created_at: number;
};

type TripRow = {
  id: string;
  user_id: string;
  destination: string;
  purpose: string;
  start_date: string | null;
  end_date: string | null;
  estimated_budget: number;
  status: string;
  comment: string | null;
  approval_steps: string;
  created_at: number;
};

function receiptsForReport(reportId: string): Receipt[] {
  const rows = db
    .prepare("SELECT id, merchant, category, amount FROM receipts WHERE report_id = ?")
    .all(reportId) as Receipt[];
  return rows.map((r) => ({ id: r.id, merchant: r.merchant, category: r.category, amount: r.amount }));
}

function attachmentsForReport(reportId: string): Attachment[] {
  const rows = db
    .prepare("SELECT id, name, size, file_type FROM uploads WHERE report_id = ? AND kind = 'attachment'")
    .all(reportId) as { id: string; name: string; size: number; file_type: string }[];
  return rows.map((r) => ({ id: r.id, name: r.name, size: r.size, fileType: r.file_type }));
}

function voiceNoteForReport(reportId: string): VoiceNote | null {
  const row = db
    .prepare("SELECT id, duration FROM uploads WHERE report_id = ? AND kind = 'voice' LIMIT 1")
    .get(reportId) as { id: string; duration: number | null } | undefined;
  if (!row) return null;
  return { id: row.id, durationLabel: mmss(row.duration) };
}

function decorateReport(row: ReportRow): Report {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    destination: row.destination,
    purpose: row.purpose,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    amount: row.amount,
    status: row.status as Report["status"],
    comment: row.comment ?? "",
    voiceNote: voiceNoteForReport(row.id),
    voiceTranscript: row.voice_transcript,
    aiSummary: row.ai_summary,
    approvalSteps: JSON.parse(row.approval_steps) as ApprovalStep[],
    receipts: receiptsForReport(row.id),
    attachments: attachmentsForReport(row.id),
  };
}

function decorateTrip(row: TripRow): Trip {
  return {
    id: row.id,
    destination: row.destination,
    purpose: row.purpose,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    estimatedBudget: row.estimated_budget,
    status: row.status as Trip["status"],
    comment: row.comment ?? "",
    approvalSteps: JSON.parse(row.approval_steps) as ApprovalStep[],
  };
}

export function listReports(userId: string): Report[] {
  const rows = db
    .prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as ReportRow[];
  return rows.map(decorateReport);
}

export function getReport(userId: string, id: string): Report | null {
  const row = db
    .prepare("SELECT * FROM reports WHERE user_id = ? AND id = ?")
    .get(userId, id) as ReportRow | undefined;
  return row ? decorateReport(row) : null;
}

export function deleteReport(userId: string, id: string): boolean {
  const row = db
    .prepare("SELECT status FROM reports WHERE user_id = ? AND id = ?")
    .get(userId, id) as { status: string } | undefined;
  if (!row) return false;
  if (row.status !== "draft" && row.status !== "rejected") return false;

  const uploads = db
    .prepare("SELECT path FROM uploads WHERE report_id = ?")
    .all(id) as { path: string }[];
  for (const u of uploads) {
    const abs = path.join(UPLOADS_DIR, u.path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }

  db.prepare("DELETE FROM receipts WHERE report_id = ?").run(id);
  db.prepare("DELETE FROM uploads WHERE report_id = ?").run(id);
  db.prepare("DELETE FROM reports WHERE id = ?").run(id);
  return true;
}

export function createReport(
  userId: string,
  input: {
    tripId: string;
    destination: string;
    purpose: string;
    startDate: string;
    endDate: string;
    comment: string;
    receipts: { merchant: string; category: string; amount: number }[];
    attachmentIds: string[];
    voiceNoteUploadId: string | null;
    voiceTranscript: string | null;
    aiSummary: string | null;
  }
): Report {
  const id = "r" + Date.now() + Math.random().toString(36).slice(2, 6);
  const amount = input.receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const approvalSteps: ApprovalStep[] = [
    { label: "Отправлено", name: "Вы", status: "done" },
    { label: "Руководитель", name: "Смирнова Е.В.", status: "pending" },
    { label: "Бухгалтерия", name: "—", status: "waiting" },
  ];

  db.prepare(
    `INSERT INTO reports (id, user_id, trip_id, title, destination, purpose, start_date, end_date, amount, status, comment, ai_summary, voice_transcript, approval_steps, created_at)
     VALUES (@id, @user_id, @trip_id, @title, @destination, @purpose, @start_date, @end_date, @amount, @status, @comment, @ai_summary, @voice_transcript, @approval_steps, @created_at)`
  ).run({
    id,
    user_id: userId,
    trip_id: input.tripId,
    title: (input.destination || "Командировка") + " — новый отчёт",
    destination: input.destination || "—",
    purpose: input.purpose,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    amount,
    status: "pending",
    comment: input.comment,
    ai_summary: input.aiSummary,
    voice_transcript: input.voiceTranscript,
    approval_steps: JSON.stringify(approvalSteps),
    created_at: Date.now(),
  });

  const insertReceipt = db.prepare(
    "INSERT INTO receipts (id, report_id, merchant, category, amount) VALUES (?, ?, ?, ?, ?)"
  );
  for (const r of input.receipts) {
    insertReceipt.run(crypto.randomUUID(), id, r.merchant, r.category, r.amount);
  }

  const linkIds = [...input.attachmentIds, ...(input.voiceNoteUploadId ? [input.voiceNoteUploadId] : [])];
  if (linkIds.length > 0) {
    const placeholders = linkIds.map(() => "?").join(",");
    db.prepare(
      `UPDATE uploads SET report_id = ? WHERE id IN (${placeholders}) AND user_id = ?`
    ).run(id, ...linkIds, userId);
  }

  return getReport(userId, id)!;
}

export function updateAttachmentType(userId: string, uploadId: string, fileType: string): boolean {
  const result = db
    .prepare("UPDATE uploads SET file_type = ? WHERE id = ? AND user_id = ? AND kind = 'attachment'")
    .run(fileType, uploadId, userId);
  return result.changes > 0;
}

export function deleteUpload(userId: string, uploadId: string): boolean {
  const row = db
    .prepare("SELECT path FROM uploads WHERE id = ? AND user_id = ?")
    .get(uploadId, userId) as { path: string } | undefined;
  if (!row) return false;
  const abs = path.join(UPLOADS_DIR, row.path);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
  db.prepare("DELETE FROM uploads WHERE id = ?").run(uploadId);
  return true;
}

export function getUploadForUser(
  userId: string,
  uploadId: string
): { path: string; name: string } | null {
  const row = db
    .prepare("SELECT path, name FROM uploads WHERE id = ? AND user_id = ?")
    .get(uploadId, userId) as { path: string; name: string } | undefined;
  return row ?? null;
}

export function listTrips(userId: string): Trip[] {
  const rows = db
    .prepare("SELECT * FROM trips WHERE user_id = ? ORDER BY start_date ASC")
    .all(userId) as TripRow[];
  return rows.map(decorateTrip);
}

export function getTrip(userId: string, id: string): Trip | null {
  const row = db
    .prepare("SELECT * FROM trips WHERE user_id = ? AND id = ?")
    .get(userId, id) as TripRow | undefined;
  return row ? decorateTrip(row) : null;
}

export function createTrip(
  userId: string,
  input: {
    destination: string;
    purpose: string;
    startDate: string;
    endDate: string;
    estimatedBudget: number;
    comment: string;
  }
): Trip {
  const id = "t" + Date.now() + Math.random().toString(36).slice(2, 6);
  const approvalSteps: ApprovalStep[] = [
    { label: "Отправлено", name: "Вы", status: "done" },
    { label: "Руководитель", name: "Смирнова Е.В.", status: "pending" },
  ];
  db.prepare(
    `INSERT INTO trips (id, user_id, destination, purpose, start_date, end_date, estimated_budget, status, comment, approval_steps, created_at)
     VALUES (@id, @user_id, @destination, @purpose, @start_date, @end_date, @estimated_budget, @status, @comment, @approval_steps, @created_at)`
  ).run({
    id,
    user_id: userId,
    destination: input.destination || "—",
    purpose: input.purpose,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    estimated_budget: input.estimatedBudget,
    status: "pending",
    comment: input.comment,
    approval_steps: JSON.stringify(approvalSteps),
    created_at: Date.now(),
  });
  return getTrip(userId, id)!;
}

export function pendingReportsCount(userId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM reports WHERE user_id = ? AND status = 'pending'")
    .get(userId) as { c: number };
  return row.c;
}

export function approvedReportsSum(userId: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as s FROM reports WHERE user_id = ? AND status = 'approved'")
    .get(userId) as { s: number };
  return row.s;
}

export function setReportBitrixItemId(reportId: string, bitrixItemId: string): void {
  db.prepare("UPDATE reports SET bitrix_item_id = ? WHERE id = ?").run(bitrixItemId, reportId);
}

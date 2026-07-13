import type { Report } from "./types";

const VIBE_BASE = "https://vibecode.bitrix24.tech";

// entityTypeId of the "Командировочные отчёты" smart process type created on
// the portal (internal type id 8, used only when defining UF_CRM_8_* fields —
// item requests address it by this public entityTypeId instead).
const ENTITY_TYPE_ID = process.env.BITRIX_REPORT_ENTITY_TYPE_ID;

// Enum value ids for the UF_CRM_8_PURPOSE / UF_CRM_8_REPORT_STATUS fields,
// captured when those fields were created on the portal.
const PURPOSE_ENUM: Record<string, number> = {
  conference: 44,
  client: 46,
  training: 48,
  other: 50,
};

const STATUS_ENUM: Record<string, number> = {
  draft: 52,
  pending: 54,
  approved: 56,
  rejected: 58,
};

type VibeMeResponse = {
  success: boolean;
  data?: { owner?: { userId?: string | number } };
  error?: { message?: string };
};

type VibeItemResponse = {
  success: boolean;
  data?: { id?: number | string };
  error?: { message?: string };
};

/**
 * Mirrors a trip report onto the Bitrix24 portal as a smart-process item.
 * Best-effort: returns null (never throws) if VIBECODE_API_KEY or
 * BITRIX_REPORT_ENTITY_TYPE_ID aren't configured, or if the portal call fails
 * — the local report is the source of truth regardless of portal sync state.
 */
export async function syncReportToBitrix(report: Report): Promise<string | null> {
  const apiKey = process.env.VIBECODE_API_KEY;
  if (!apiKey || !ENTITY_TYPE_ID) return null;

  const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };

  try {
    const meRes = await fetch(`${VIBE_BASE}/v1/me`, { headers });
    const me = (await meRes.json()) as VibeMeResponse;
    if (!meRes.ok || !me.success || !me.data?.owner?.userId) return null;

    const payload: Record<string, unknown> = {
      title: report.title,
      opened: true,
      assignedById: Number(me.data.owner.userId),
      xmlId: `trip-report-${report.id}`,
      ufCrm8Destination: report.destination,
      ufCrm8Amount: `${report.amount}|RUB`,
      ufCrm8Comment: report.comment || "",
      ufCrm8AiSummary: report.aiSummary || "",
    };
    if (report.startDate) payload.begindate = report.startDate;
    if (report.endDate) payload.closedate = report.endDate;
    if (PURPOSE_ENUM[report.purpose]) payload.ufCrm8Purpose = PURPOSE_ENUM[report.purpose];
    if (STATUS_ENUM[report.status]) payload.ufCrm8ReportStatus = STATUS_ENUM[report.status];

    const itemRes = await fetch(`${VIBE_BASE}/v1/items/${ENTITY_TYPE_ID}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const itemData = (await itemRes.json()) as VibeItemResponse;
    if (!itemRes.ok || !itemData.success || !itemData.data?.id) return null;

    return String(itemData.data.id);
  } catch {
    return null;
  }
}

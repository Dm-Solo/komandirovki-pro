import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReport } from "@/lib/data";
import { ATTACHMENT_TYPES, PURPOSE_LABELS, STATUS_META, STEP_DOT } from "@/lib/constants";
import { dateRange, fmt } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import DeleteReportButton from "@/components/DeleteReportButton";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { success } = await searchParams;
  const report = getReport(user.id, id);
  if (!report) notFound();

  const meta = STATUS_META[report.status];
  const canDelete = report.status === "draft" || report.status === "rejected";

  return (
    <div className="p-4.5 md:p-8 max-w-[640px] mx-auto pb-16 md:pb-12">
      {success && (
        <div
          className="flex items-center gap-3 rounded-2xl py-3.5 px-4.5 mb-4.5"
          style={{ background: "oklch(0.95 0.05 150)", color: "oklch(0.4 0.13 150)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-sm flex-none"
            style={{ background: "var(--success)", color: "#fff" }}
          >
            ✓
          </div>
          <div className="text-[13.5px] font-bold">Отчёт отправлен на согласование</div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-5">
        <a
          href="/reports"
          className="border-none w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base no-underline"
          style={{ background: "oklch(0.95 0.005 255)", color: "oklch(0.4 0.01 255)" }}
        >
          ←
        </a>
        <div className="text-[19px] font-extrabold flex-1 truncate">{report.title}</div>
        <StatusBadge label={meta.label} bg={meta.bg} color={meta.color} />
        {canDelete && <DeleteReportButton reportId={report.id} />}
      </div>

      <div className="bg-white border rounded-2xl py-4.5 px-5 mb-3.5" style={{ borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 gap-3.5 text-[13px]">
          <Info label="Направление" value={report.destination} />
          <Info label="Цель" value={PURPOSE_LABELS[report.purpose] || report.purpose} />
          <Info label="Даты" value={dateRange(report.startDate, report.endDate)} />
          <Info label="Сумма" value={`${fmt(report.amount)} ₽`} />
        </div>

        {report.voiceNote && (
          <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
            <span className="text-sm">🎙️</span>
            <audio controls src={`/api/files/${report.voiceNote.id}`} className="h-[30px] flex-1 min-w-0" />
            <div className="text-[11.5px] whitespace-nowrap" style={{ color: "var(--muted-2)" }}>
              {report.voiceNote.durationLabel}
            </div>
          </div>
        )}

        {report.attachments.length > 0 && (
          <div className="mt-3.5 pt-3.5 border-t flex flex-col gap-1.5" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
            {report.attachments.map((a) => (
              <div key={a.id} className="flex justify-between text-[12.5px]">
                <div style={{ color: "oklch(0.35 0.015 255)" }}>📎 {a.name}</div>
                <div className="font-semibold" style={{ color: "var(--muted-2)" }}>
                  {ATTACHMENT_TYPES.find((t) => t.value === a.fileType)?.label || a.fileType}
                </div>
              </div>
            ))}
          </div>
        )}

        {report.aiSummary && (
          <div className="mt-3.5 pt-3.5 border-t" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
            <div className="text-xs font-extrabold mb-1.5">✨ Анализ ИИ</div>
            <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.35 0.015 255)" }}>
              {report.aiSummary}
            </div>
          </div>
        )}
      </div>

      {report.status === "draft" ? (
        <div
          className="border-[1.5px] border-dashed rounded-2xl py-5.5 px-5 text-center text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          Черновик ещё не отправлен на согласование
        </div>
      ) : (
        <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
          <div className="text-[13px] font-extrabold mb-3">Маршрут согласования</div>
          {report.approvalSteps.map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: STEP_DOT[a.status] }} />
              <span className="text-[13px] font-semibold w-[110px] flex-none" style={{ color: "oklch(0.35 0.015 255)" }}>
                {a.label}
              </span>
              <span className="text-[12.5px]" style={{ color: "var(--muted-2)" }}>
                {a.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5" style={{ color: "var(--muted-2)" }}>
        {label}
      </div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

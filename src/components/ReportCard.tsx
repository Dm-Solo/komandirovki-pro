"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PURPOSE_LABELS, STATUS_META } from "@/lib/constants";
import { dateRange, fmt } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import type { Report } from "@/lib/types";

export default function ReportCard({ report }: { report: Report }) {
  const router = useRouter();
  const meta = STATUS_META[report.status];
  const canDelete = report.status === "draft" || report.status === "rejected";

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Удалить этот отчёт?")) return;
    await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <Link
      href={`/reports/${report.id}`}
      className="cursor-pointer bg-white border rounded-xl py-4 px-4.5 flex items-center gap-3.5 shadow-sm hover:border-[var(--primary)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-bold text-[14.5px] flex-1 min-w-0 truncate">{report.title}</div>
          <div
            className="text-[11px] font-bold py-0.5 px-2 rounded-md flex-none whitespace-nowrap"
            style={{ background: "oklch(0.95 0.005 255)", color: "oklch(0.45 0.01 255)" }}
          >
            {PURPOSE_LABELS[report.purpose] || report.purpose}
          </div>
        </div>
        <div className="text-[12.5px] mt-0.5" style={{ color: "var(--muted)" }}>
          {report.destination} · {dateRange(report.startDate, report.endDate)}
        </div>
      </div>
      <div className="text-right flex-none">
        <div className="font-extrabold text-[15px]">{fmt(report.amount)} ₽</div>
        <div className="mt-1">
          <StatusBadge label={meta.label} bg={meta.bg} color={meta.color} />
        </div>
      </div>
      {canDelete && (
        <button
          onClick={onDelete}
          title="Удалить отчёт"
          className="flex-none border-none w-[30px] h-[30px] rounded-lg cursor-pointer text-[15px] font-bold"
          style={{ background: "oklch(0.95 0.05 25)", color: "var(--danger)" }}
        >
          ×
        </button>
      )}
    </Link>
  );
}

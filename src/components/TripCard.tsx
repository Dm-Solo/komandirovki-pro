import Link from "next/link";
import { PURPOSE_LABELS, TRIP_STATUS_META } from "@/lib/constants";
import { dateRange, fmt } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import type { Trip } from "@/lib/types";

export default function TripCard({ trip }: { trip: Trip }) {
  const meta = TRIP_STATUS_META[trip.status];
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="cursor-pointer bg-white border rounded-xl py-3.5 px-4.5 flex items-center gap-3.5 hover:border-[var(--primary)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-10 h-10 rounded-[9px] flex-none flex items-center justify-center text-base"
        style={{ background: "var(--primary-soft)" }}
      >
        📅
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px] truncate">{trip.destination}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {PURPOSE_LABELS[trip.purpose] || trip.purpose} · {dateRange(trip.startDate, trip.endDate)}
        </div>
      </div>
      <div className="text-right flex-none">
        <div className="text-[12.5px] font-bold" style={{ color: "oklch(0.4 0.015 255)" }}>
          ~{fmt(trip.estimatedBudget)} ₽
        </div>
        <div className="mt-1">
          <StatusBadge label={meta.label} bg={meta.bg} color={meta.color} small />
        </div>
      </div>
    </Link>
  );
}

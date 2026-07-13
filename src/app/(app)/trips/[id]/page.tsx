import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/data";
import { PURPOSE_LABELS, STEP_DOT, TRIP_STATUS_META } from "@/lib/constants";
import { dateRange, fmt } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const trip = getTrip(user.id, id);
  if (!trip) notFound();

  const meta = TRIP_STATUS_META[trip.status];

  return (
    <div className="p-4.5 md:p-8 max-w-[640px] mx-auto pb-16 md:pb-12">
      <div className="flex items-center gap-3 mb-5">
        <a
          href="/trips"
          className="border-none w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base no-underline"
          style={{ background: "oklch(0.95 0.005 255)", color: "oklch(0.4 0.01 255)" }}
        >
          ←
        </a>
        <div className="text-[19px] font-extrabold flex-1 truncate">{trip.destination}</div>
        <StatusBadge label={meta.label} bg={meta.bg} color={meta.color} />
      </div>

      <a
        href={`/reports/new?fromTrip=${trip.id}`}
        className="inline-block border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-4.5 rounded-[10px] shadow-md mb-3.5 no-underline"
        style={{ background: "var(--primary)" }}
      >
        + Создать отчёт
      </a>

      <div className="bg-white border rounded-2xl py-4.5 px-5 mb-3.5" style={{ borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 gap-3.5 text-[13px]">
          <Info label="Цель" value={PURPOSE_LABELS[trip.purpose] || trip.purpose} />
          <Info label="Даты" value={dateRange(trip.startDate, trip.endDate)} />
          <Info label="Ориентировочный бюджет" value={`${fmt(trip.estimatedBudget)} ₽`} />
        </div>
        {trip.comment && (
          <div className="mt-3.5 pt-3.5 border-t text-[13px]" style={{ borderColor: "oklch(0.95 0.005 255)", color: "oklch(0.35 0.015 255)" }}>
            {trip.comment}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
        <div className="text-[13px] font-extrabold mb-3">Маршрут согласования</div>
        {trip.approvalSteps.map((a, i) => (
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listReports, listTrips } from "@/lib/data";
import { MONTH_NAMES, STATUS_META, TRIP_STATUS_META, WEEKDAY_NAMES } from "@/lib/constants";

type Event = {
  id: string;
  label: string;
  kind: "trip" | "report";
  start: string;
  end: string;
  bg: string;
  color: string;
  href: string;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const now = new Date();
  const year = sp.y ? Number(sp.y) : now.getFullYear();
  const month = sp.m ? Number(sp.m) : now.getMonth();

  const reports = listReports(user.id);
  const trips = listTrips(user.id);

  const events: Event[] = [
    ...trips.map((t) => {
      const meta = TRIP_STATUS_META[t.status];
      return {
        id: t.id,
        label: t.destination,
        kind: "trip" as const,
        start: t.startDate,
        end: t.endDate,
        bg: meta?.bg || "oklch(0.95 0.03 258)",
        color: meta?.color || "oklch(0.5 0.1 258)",
        href: `/trips/${t.id}`,
      };
    }),
    ...reports
      .filter((r) => r.startDate && r.endDate)
      .map((r) => {
        const meta = STATUS_META[r.status];
        return {
          id: r.id,
          label: r.title,
          kind: "report" as const,
          start: r.startDate,
          end: r.endDate,
          bg: meta?.bg || "oklch(0.95 0.03 258)",
          color: meta?.color || "oklch(0.5 0.1 258)",
          href: `/reports/${r.id}`,
        };
      }),
  ];

  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const firstOfMonth = new Date(year, month, 1);
  const jsWeekday = firstOfMonth.getDay();
  const mondayOffset = (jsWeekday + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  const todayISO = toISO(new Date());

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const iso = toISO(d);
    const inMonth = d.getMonth() === month;
    const dayEvents = events.filter((ev) => ev.start && ev.end && iso >= ev.start && iso <= ev.end);
    days.push({
      dayNumber: d.getDate(),
      inMonth,
      isToday: iso === todayISO,
      events: dayEvents.slice(0, 3),
      moreCount: Math.max(0, dayEvents.length - 3),
    });
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);

  return (
    <div className="p-4.5 md:p-8 max-w-[960px] mx-auto pb-16 md:pb-12">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-[22px] font-extrabold tracking-tight">Календарь командировок</div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/calendar?y=${prev.getFullYear()}&m=${prev.getMonth()}`}
            className="border rounded-lg bg-white w-8 h-8 flex items-center justify-center text-sm no-underline"
            style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
          >
            ‹
          </Link>
          <div className="text-[14.5px] font-bold min-w-[150px] text-center">
            {MONTH_NAMES[month]} {year}
          </div>
          <Link
            href={`/calendar?y=${next.getFullYear()}&m=${next.getMonth()}`}
            className="border rounded-lg bg-white w-8 h-8 flex items-center justify-center text-sm no-underline"
            style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
          >
            ›
          </Link>
        </div>
      </div>

      <div
        className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border"
        style={{ background: "var(--border)", borderColor: "var(--border)" }}
      >
        {WEEKDAY_NAMES.map((wd) => (
          <div
            key={wd}
            className="py-2 px-2.5 text-[11.5px] font-bold text-center"
            style={{ background: "oklch(0.97 0.004 255)", color: "var(--muted)" }}
          >
            {wd}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className="min-h-[92px] py-1.5 px-1.5 flex flex-col gap-1"
            style={{ background: day.isToday ? "var(--primary-soft)" : "#fff" }}
          >
            <div
              className="text-xs font-bold px-0.5"
              style={{ color: day.inMonth ? "oklch(0.25 0.02 255)" : "oklch(0.75 0.008 255)" }}
            >
              {day.dayNumber}
            </div>
            {day.events.map((ev) => (
              <Link
                key={ev.id}
                href={ev.href}
                className="cursor-pointer text-[10.5px] font-bold py-0.5 px-1.5 rounded-md whitespace-nowrap overflow-hidden text-ellipsis no-underline"
                style={{ background: ev.bg, color: ev.color }}
              >
                {ev.label}
              </Link>
            ))}
            {day.moreCount > 0 && (
              <div className="text-[10px] px-1" style={{ color: "var(--muted-2)" }}>
                +{day.moreCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

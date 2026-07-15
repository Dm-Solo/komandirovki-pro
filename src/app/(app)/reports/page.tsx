import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { approvedReportsSum, listReports, pendingReportsCount } from "@/lib/data";
import { fmt } from "@/lib/format";
import ReportCard from "@/components/ReportCard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const reports = listReports(user.id);
  const pendingCount = pendingReportsCount(user.id);
  const approvedSum = approvedReportsSum(user.id);

  return (
    <div className="p-4.5 md:p-8 max-w-[920px] mx-auto pb-16 md:pb-12">
      <div className="mb-5.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[22px] font-extrabold tracking-tight">Мои отчёты о командировках</div>
          <Link
            href="/reports/new"
            className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-4.5 rounded-[10px] shadow-md whitespace-nowrap"
            style={{ background: "var(--primary)" }}
          >
            + Добавить
          </Link>
        </div>
        <div className="text-[13.5px] mt-1" style={{ color: "var(--muted)" }}>
          Всего отчётов: {reports.length}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5.5">
        <StatTile label="Всего" value={String(reports.length)} />
        <StatTile label="На согласовании" value={String(pendingCount)} color="var(--warning)" />
        <StatTile label="Утверждено, ₽" value={fmt(approvedSum)} color="var(--success)" />
      </div>

      {reports.length === 0 ? (
        <div
          className="border-[1.5px] border-dashed rounded-2xl py-9 px-5 text-center text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}
        >
          Отчётов ещё нет
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border rounded-xl py-4 px-4.5 shadow-sm" style={{ borderColor: "var(--border)" }}>
      <div
        className="text-[11.5px] font-bold uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>
      <div className="text-2xl font-extrabold mt-1.5" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

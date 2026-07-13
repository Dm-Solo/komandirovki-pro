"use client";

import { useRouter } from "next/navigation";

export default function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const onDelete = async () => {
    if (!confirm("Удалить этот отчёт?")) return;
    await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  };
  return (
    <button
      onClick={onDelete}
      title="Удалить отчёт"
      className="border-none w-[34px] h-[34px] rounded-[9px] cursor-pointer text-[15px]"
      style={{ background: "oklch(0.95 0.05 25)", color: "var(--danger)" }}
    >
      🗑
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PURPOSE_LABELS } from "@/lib/constants";

export default function NewTripPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("conference");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = !!(destination && startDate && endDate);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, purpose, startDate, endDate, estimatedBudget, comment }),
    });
    router.push("/trips");
    router.refresh();
  };

  return (
    <div className="p-4.5 md:p-8 max-w-[640px] mx-auto pb-16 md:pb-12">
      <div className="flex items-center gap-3 mb-5.5">
        <a
          href="/trips"
          className="border-none w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base no-underline"
          style={{ background: "oklch(0.95 0.005 255)", color: "oklch(0.4 0.01 255)" }}
        >
          ←
        </a>
        <div className="text-xl font-extrabold tracking-tight">Заявка на командировку</div>
      </div>

      <div className="bg-white border rounded-2xl p-5.5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <Field label="Направление">
          <input
            className="input"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Город, страна"
          />
        </Field>
        <Field label="Цель поездки">
          <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Дата начала">
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Дата окончания">
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Ориентировочный бюджет, ₽">
          <input
            className="input"
            type="number"
            value={estimatedBudget}
            onChange={(e) => setEstimatedBudget(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Обоснование (необязательно)">
          <textarea
            className="input"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Зачем нужна поездка"
          />
        </Field>
      </div>

      <div className="flex justify-between mt-5.5">
        <a
          href="/trips"
          className="border rounded-[10px] bg-white font-bold text-[13.5px] py-2.5 px-4.5 no-underline"
          style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
        >
          Отмена
        </a>
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-5 rounded-[10px] disabled:cursor-not-allowed"
          style={{ background: valid ? "var(--primary)" : "oklch(0.85 0.006 255)" }}
        >
          Отправить на согласование
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12.5px] font-bold mb-1.5" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

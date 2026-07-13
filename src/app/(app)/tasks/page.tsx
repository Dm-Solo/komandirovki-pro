"use client";

import { useState } from "react";

const PRIORITY_OPTIONS = [
  { value: "0", label: "Низкий" },
  { value: "1", label: "Обычный" },
  { value: "2", label: "Высокий" },
];

export default function NewTaskPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id?: number | string; title?: string } | null>(null);

  const valid = !!title.trim();

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/bitrix/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, deadline, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось создать задачу");
        return;
      }
      setCreated(data.task);
      setTitle("");
      setDescription("");
      setDeadline("");
      setPriority("1");
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4.5 md:p-8 max-w-[640px] mx-auto pb-16 md:pb-12">
      <div className="flex items-center gap-3 mb-5.5">
        <div className="text-xl font-extrabold tracking-tight">Новая задача на портале</div>
      </div>

      {created && (
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
          <div className="text-[13.5px] font-bold">
            Задача «{created.title}» создана на портале{created.id ? ` (№${created.id})` : ""}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-2xl p-5.5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <Field label="Название">
          <input
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Согласовать командировку в Казань"
          />
        </Field>
        <Field label="Описание (необязательно)">
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробности задачи"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Срок (необязательно)">
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Приоритет">
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <div className="text-[12.5px]" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-5.5">
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-5 rounded-[10px] disabled:cursor-not-allowed"
          style={{ background: valid ? "var(--primary)" : "oklch(0.85 0.006 255)" }}
        >
          {busy ? "Создаём…" : "Создать задачу"}
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

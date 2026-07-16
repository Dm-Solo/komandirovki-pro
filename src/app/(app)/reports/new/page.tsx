"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ATTACHMENT_TYPES,
  CATEGORY_OPTIONS,
  PURPOSE_LABELS,
  RECEIPT_TEMPLATES,
  STEP_DOT,
} from "@/lib/constants";
import { fmt, formatFileSize } from "@/lib/format";
import VoiceRecorder, { type VoiceNoteValue } from "@/components/VoiceRecorder";
import type { Trip } from "@/lib/types";

type LocalReceipt = {
  id: string;
  scanning: boolean;
  merchant: string;
  category: string;
  amount: number | string;
};

type LocalAttachment = {
  id: string;
  name: string;
  size: number;
  fileType: string;
};

const STEP_LABELS = ["Информация", "Чеки", "Проверка"];

// Decodes an arbitrary audio blob and resamples it to headerless 16-bit
// signed little-endian mono PCM at 16000 Hz, per Yandex SpeechKit's lpcm spec.
async function decodeToPcm16(blob: Blob): Promise<ArrayBuffer> {
  const targetRate = 16000;
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  const channelData = rendered.getChannelData(0);

  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16.buffer;
}

async function transcribeVoiceNote(uploadId: string): Promise<string> {
  const audioRes = await fetch(`/api/files/${uploadId}`);
  if (!audioRes.ok) throw new Error("Не удалось загрузить аудиофайл");
  const blob = await audioRes.blob();
  const pcm = await decodeToPcm16(blob);

  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: pcm,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Не удалось распознать голосовое сообщение");
  return data.text as string;
}

export default function NewReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [tripId, setTripId] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("conference");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comment, setComment] = useState("");
  const [voiceNote, setVoiceNote] = useState<VoiceNoteValue>(null);
  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStage, setAiStage] = useState<"transcribing" | "analyzing" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptionPromiseRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data: { trips?: Trip[] }) => setTrips(data.trips ?? []));

    const fromTrip = searchParams.get("fromTrip");
    if (fromTrip) applyTrip(fromTrip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTrip = (id: string) => {
    setTripId(id);
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then((data: { trip?: Trip }) => {
        if (data.trip) {
          setDestination(data.trip.destination);
          setPurpose(data.trip.purpose);
          setStartDate(data.trip.startDate);
          setEndDate(data.trip.endDate);
        }
      });
  };

  const step1Valid = !!(tripId && destination && startDate && endDate);
  const receiptsScanning = receipts.some((r) => r.scanning);
  const step2Valid = receipts.length > 0 && !receiptsScanning;
  const transcriptionPending = !!voiceNote && voiceTranscript === null;
  const nextDisabled = step === 0 ? !step1Valid : step === 1 ? !step2Valid || transcriptionPending : false;

  // Shares one in-flight transcription across all trigger points (step
  // transition, AI-analyze, submit) instead of racing duplicate requests.
  const ensureTranscript = (): Promise<string> => {
    if (voiceTranscript !== null) return Promise.resolve(voiceTranscript);
    if (!voiceNote) return Promise.resolve("");
    if (!transcriptionPromiseRef.current) {
      transcriptionPromiseRef.current = transcribeVoiceNote(voiceNote.id)
        .then((text) => {
          setVoiceTranscript(text);
          return text;
        })
        .catch((err) => {
          console.error("Не удалось распознать голосовое сообщение", err);
          setVoiceTranscript("");
          return "";
        })
        .finally(() => {
          transcriptionPromiseRef.current = null;
        });
    }
    return transcriptionPromiseRef.current;
  };

  const goToNextStep = () => {
    if (step === 0 && voiceNote) ensureTranscript();
    setStep((s) => Math.min(2, s + 1));
  };

  const addReceipt = () => {
    const id = "rc" + Date.now() + Math.random().toString(36).slice(2, 6);
    let templateIndex = 0;
    setReceipts((prev) => {
      templateIndex = prev.length % RECEIPT_TEMPLATES.length;
      return [...prev, { id, scanning: true, merchant: "", category: CATEGORY_OPTIONS[0], amount: 0 }];
    });
    setTimeout(() => {
      const tpl = RECEIPT_TEMPLATES[templateIndex];
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id ? { id, scanning: false, merchant: tpl.merchant, category: tpl.category, amount: tpl.amount } : r
        )
      );
    }, 900);
  };

  const updateReceipt = (id: string, patch: Partial<LocalReceipt>) => {
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  const receiptsTotal = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("kind", "attachment");
      form.append("fileType", "ticket");
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => [...prev, { id: data.id, name: data.name, size: data.size, fileType: data.fileType }]);
      }
    }
  };

  const updateAttachmentType = async (id: string, fileType: string) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, fileType } : a)));
    await fetch(`/api/uploads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileType }),
    });
  };

  const removeAttachment = async (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/uploads/${id}`, { method: "DELETE" });
  };

  const analyzeWithAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      if (voiceNote && voiceTranscript === null) setAiStage("transcribing");
      const transcript = await ensureTranscript();

      setAiStage("analyzing");
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          purpose,
          startDate,
          endDate,
          comment,
          hasVoiceNote: !!voiceNote,
          voiceTranscript: transcript || "",
          receipts: receipts.filter((r) => !r.scanning).map((r) => ({ merchant: r.merchant, category: r.category, amount: r.amount })),
          attachments: attachments.map((a) => ({ name: a.name, fileType: a.fileType })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Не удалось получить анализ ИИ. Попробуйте ещё раз.");
      } else {
        setAiSummary(data.summary);
      }
    } catch {
      setAiError("Не удалось получить анализ ИИ. Попробуйте ещё раз.");
    } finally {
      setAiLoading(false);
      setAiStage(null);
    }
  };

  const submitReport = async () => {
    setSubmitting(true);

    const transcript = await ensureTranscript();

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        destination,
        purpose,
        startDate,
        endDate,
        comment,
        receipts: receipts.filter((r) => !r.scanning).map((r) => ({ merchant: r.merchant, category: r.category, amount: Number(r.amount) || 0 })),
        attachmentIds: attachments.map((a) => a.id),
        voiceNoteUploadId: voiceNote?.id ?? null,
        voiceTranscript: transcript || null,
        aiSummary,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/reports/${data.report.id}?success=1`);
    } else {
      setSubmitting(false);
    }
  };

  const previewApprovalSteps = [
    { label: "Отправлено", name: "Вы", dot: STEP_DOT.done },
    { label: "Руководитель", name: "Смирнова Е.В.", dot: STEP_DOT.waiting },
    { label: "Бухгалтерия", name: "—", dot: STEP_DOT.waiting },
  ];

  return (
    <div className="p-4.5 md:p-8 max-w-[720px] mx-auto pb-16 md:pb-12">
      <div className="flex items-center gap-3 mb-5.5">
        <a
          href="/reports"
          className="border-none w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base no-underline"
          style={{ background: "oklch(0.95 0.005 255)", color: "oklch(0.4 0.01 255)" }}
        >
          ←
        </a>
        <div className="text-xl font-extrabold tracking-tight">Новый отчёт о командировке</div>
      </div>

      <div className="flex items-center mb-6.5">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center" style={{ flex: i === STEP_LABELS.length - 1 ? "0" : "1" }}>
              <div className="flex flex-col items-center gap-1.5 flex-none">
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-[12.5px]"
                  style={{
                    background: done ? "var(--success)" : active ? "var(--primary)" : "oklch(0.95 0.005 255)",
                    color: done || active ? "#fff" : "var(--muted)",
                    border: done || active ? "none" : "1px solid var(--border)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div
                  className="text-[11.5px] font-semibold whitespace-nowrap"
                  style={{ color: active ? "var(--ink)" : "var(--muted-2)" }}
                >
                  {label}
                </div>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="h-0.5 flex-1 mx-2 mb-5"
                  style={{ background: done ? "var(--success)" : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === 0 && trips && trips.length === 0 && (
        <div
          className="border-[1.5px] border-dashed rounded-2xl py-9 px-5 text-center text-[13px] flex flex-col items-center gap-3"
          style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}
        >
          <div>Отчёт можно создать только для существующей командировки. У вас пока нет ни одной.</div>
          <a
            href="/trips/new"
            className="inline-block border-none cursor-pointer text-white font-bold text-[13px] py-2.5 px-4.5 rounded-[10px] no-underline"
            style={{ background: "var(--primary)" }}
          >
            + Новая командировка
          </a>
        </div>
      )}

      {step === 0 && trips && trips.length > 0 && (
        <div className="bg-white border rounded-2xl p-5.5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
          <Field label="Командировка">
            <select className="input" value={tripId} onChange={(e) => applyTrip(e.target.value)}>
              <option value="" disabled>
                Выберите командировку
              </option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.destination} · {t.startDate} — {t.endDate}
                </option>
              ))}
            </select>
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
          <Field label="Направление">
            <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Город, страна" />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Дата начала">
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Дата окончания">
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Комментарий (необязательно)">
            <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Краткое описание цели поездки" />
          </Field>
          <Field label="Голосовой комментарий (необязательно)">
            <VoiceRecorder
              value={voiceNote}
              onChange={(v) => {
                setVoiceNote(v);
                setVoiceTranscript(null);
              }}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          {transcriptionPending && (
            <div
              className="rounded-2xl py-3.5 px-4.5 flex flex-col gap-2.5"
              style={{ background: "var(--primary-soft)" }}
            >
              <div className="flex items-center gap-2.5 text-[13px] font-bold" style={{ color: "var(--primary-dark)" }}>
                <span className="text-[15px]">🎙️</span> Распознаём голосовую заметку… это займёт немного времени
              </div>
              <div className="progress-track">
                <div className="progress-bar-indeterminate" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-[13.5px]" style={{ color: "var(--muted)" }}>
              Загрузите чеки — данные будут распознаны автоматически
            </div>
            <button
              onClick={addReceipt}
              className="border border-dashed font-bold text-[13px] py-2 px-3.5 rounded-[9px] cursor-pointer whitespace-nowrap"
              style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-dark)" }}
            >
              + Добавить чек
            </button>
          </div>

          {receipts.length === 0 && (
            <div className="border-[1.5px] border-dashed rounded-2xl py-9 px-5 text-center text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}>
              Чеки ещё не добавлены
            </div>
          )}

          {receipts.map((rc) => (
            <div key={rc.id} className="bg-white border rounded-xl py-3.5 px-4 flex items-center gap-3.5" style={{ borderColor: "var(--border)" }}>
              <div
                className="w-10 h-10 rounded-[9px] flex-none flex items-center justify-center text-base"
                style={{ background: "oklch(0.95 0.005 255)" }}
              >
                🧾
              </div>
              {rc.scanning ? (
                <>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="oc-shimmer h-3 w-3/5 rounded" />
                    <div className="oc-shimmer h-[11px] w-2/5 rounded" />
                  </div>
                  <div className="text-xs font-semibold flex-none" style={{ color: "var(--muted)" }}>
                    Распознаём…
                  </div>
                </>
              ) : (
                <>
                  <input
                    className="flex-1 min-w-0 py-2 px-2.5 rounded-lg border text-[13px] font-semibold"
                    style={{ borderColor: "var(--border)" }}
                    value={rc.merchant}
                    onChange={(e) => updateReceipt(rc.id, { merchant: e.target.value })}
                  />
                  <select
                    className="w-[130px] flex-none py-2 px-2.5 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: "var(--border)" }}
                    value={rc.category}
                    onChange={(e) => updateReceipt(rc.id, { category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-24 flex-none py-2 px-2.5 rounded-lg border text-[13px] font-bold text-right"
                    style={{ borderColor: "var(--border)" }}
                    type="number"
                    value={rc.amount}
                    onChange={(e) => updateReceipt(rc.id, { amount: e.target.value })}
                  />
                  <button
                    onClick={() => removeReceipt(rc.id)}
                    className="flex-none border-none w-7 h-7 rounded-lg cursor-pointer text-sm font-bold"
                    style={{ background: "oklch(0.95 0.05 25)", color: "var(--danger)" }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}

          {receipts.length > 0 && (
            <div className="flex justify-end pt-1.5 border-t" style={{ borderColor: "oklch(0.93 0.006 255)" }}>
              <div className="text-[13.5px] font-bold">
                Итого: <span className="text-base">{fmt(receiptsTotal)} ₽</span>
              </div>
            </div>
          )}

          <div className="mt-2.5 pt-4 border-t flex flex-col gap-3" style={{ borderColor: "oklch(0.93 0.006 255)" }}>
            <div className="flex items-center justify-between">
              <div className="text-[13.5px]" style={{ color: "var(--muted)" }}>
                Прочие файлы (билеты, брони, договоры)
              </div>
              <input ref={fileInputRef} type="file" multiple onChange={onFilesSelected} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed font-bold text-[13px] py-2 px-3.5 rounded-[9px] cursor-pointer whitespace-nowrap"
                style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-dark)" }}
              >
                + Добавить файл
              </button>
            </div>

            {attachments.length === 0 && (
              <div className="border-[1.5px] border-dashed rounded-2xl py-5 px-5 text-center text-[12.5px]" style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}>
                Файлы ещё не добавлены
              </div>
            )}

            {attachments.map((att) => (
              <div key={att.id} className="bg-white border rounded-xl py-3 px-3.5 flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
                <div
                  className="w-9 h-9 rounded-lg flex-none flex items-center justify-center text-[15px]"
                  style={{ background: "oklch(0.95 0.005 255)" }}
                >
                  📎
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{att.name}</div>
                  <div className="text-[11.5px]" style={{ color: "var(--muted-2)" }}>
                    {formatFileSize(att.size)}
                  </div>
                </div>
                <select
                  className="w-[150px] flex-none py-2 px-2.5 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: "var(--border)" }}
                  value={att.fileType}
                  onChange={(e) => updateAttachmentType(att.id, e.target.value)}
                >
                  {ATTACHMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="flex-none border-none w-7 h-7 rounded-lg cursor-pointer text-sm font-bold"
                  style={{ background: "oklch(0.95 0.05 25)", color: "var(--danger)" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[13px] font-extrabold mb-2.5">Поездка</div>
            <div className="text-[13.5px] leading-relaxed" style={{ color: "oklch(0.3 0.015 255)" }}>
              {destination} · {PURPOSE_LABELS[purpose] || purpose}
              <br />
              {startDate} — {endDate}
            </div>
            {voiceNote && (
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
                <span className="text-sm">🎙️</span>
                <audio controls src={`/api/files/${voiceNote.id}`} className="h-[30px] flex-1 min-w-0" />
                <div className="text-[11.5px] whitespace-nowrap" style={{ color: "var(--muted-2)" }}>
                  {voiceNote.durationLabel}
                </div>
              </div>
            )}
            {voiceNote && voiceTranscript && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
                <div className="text-xs font-extrabold mb-1.5">📝 Расшифровка голосового комментария</div>
                <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.35 0.015 255)" }}>
                  {voiceTranscript}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[13px] font-extrabold mb-2.5">Чеки ({receipts.length})</div>
            {receipts.map((rc) => (
              <div key={rc.id} className="flex justify-between py-1.5 border-b text-[13px]" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
                <div style={{ color: "oklch(0.35 0.015 255)" }}>
                  {rc.merchant} <span style={{ color: "var(--muted-2)" }}>· {rc.category}</span>
                </div>
                <div className="font-bold">{fmt(Number(rc.amount) || 0)} ₽</div>
              </div>
            ))}
            <div className="flex justify-between pt-2.5 font-extrabold text-[14.5px]">
              <div>Итого</div>
              <div>{fmt(receiptsTotal)} ₽</div>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
              <div className="text-[13px] font-extrabold mb-2.5">Файлы ({attachments.length})</div>
              {attachments.map((att) => (
                <div key={att.id} className="flex justify-between py-1.5 border-b text-[13px]" style={{ borderColor: "oklch(0.95 0.005 255)" }}>
                  <div style={{ color: "oklch(0.35 0.015 255)" }}>📎 {att.name}</div>
                  <div className="font-semibold" style={{ color: "var(--muted-2)" }}>
                    {ATTACHMENT_TYPES.find((t) => t.value === att.fileType)?.label || att.fileType}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-2.5 mb-1">
              <div className="text-[13px] font-extrabold">Анализ ИИ</div>
              <button
                onClick={analyzeWithAi}
                disabled={aiLoading}
                className="border border-dashed font-bold text-xs py-2 px-3.5 rounded-[9px] cursor-pointer whitespace-nowrap disabled:opacity-60"
                style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-dark)" }}
              >
                ✨{" "}
                {aiStage === "transcribing"
                  ? "Распознаём голос…"
                  : aiStage === "analyzing"
                  ? "Анализируем…"
                  : aiSummary
                  ? "Повторить анализ"
                  : "Сформировать отчёт с ИИ"}
              </button>
            </div>
            <div className="text-xs mb-2.5" style={{ color: "var(--muted)" }}>
              Отправляет чеки, файлы, голосовую заметку и другие материалы в ИИ для формирования отчёта
            </div>
            {aiLoading && (
              <div className="flex flex-col gap-1.5">
                <div className="oc-shimmer h-3 w-[90%] rounded" />
                <div className="oc-shimmer h-3 w-3/4 rounded" />
                <div className="oc-shimmer h-3 w-1/2 rounded" />
              </div>
            )}
            {aiError && (
              <div className="text-[12.5px]" style={{ color: "var(--danger)" }}>
                {aiError}
              </div>
            )}
            {aiSummary && (
              <div
                className="text-[13px] leading-relaxed whitespace-pre-wrap rounded-lg py-3 px-3.5"
                style={{ color: "oklch(0.3 0.015 255)", background: "oklch(0.97 0.01 258)" }}
              >
                {aiSummary}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-2xl py-4.5 px-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-[13px] font-extrabold mb-3">Маршрут согласования</div>
            {previewApprovalSteps.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: a.dot }} />
                <span className="text-[13px] font-semibold" style={{ color: "oklch(0.35 0.015 255)" }}>
                  {a.label}
                </span>
                <span className="text-[12.5px]" style={{ color: "var(--muted-2)" }}>
                  {a.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-5.5">
        {step === 0 ? (
          <a
            href="/reports"
            className="border rounded-[10px] bg-white font-bold text-[13.5px] py-2.5 px-4.5 no-underline"
            style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
          >
            Отмена
          </a>
        ) : (
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="border rounded-[10px] bg-white font-bold text-[13.5px] py-2.5 px-4.5 cursor-pointer"
            style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
          >
            Назад
          </button>
        )}

        {step === 2 ? (
          <button
            onClick={submitReport}
            disabled={submitting}
            className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-5 rounded-[10px] shadow-md disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            Отправить на согласование
          </button>
        ) : (
          <button
            onClick={goToNextStep}
            disabled={nextDisabled}
            className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-5 rounded-[10px] disabled:cursor-not-allowed"
            style={{ background: nextDisabled ? "oklch(0.85 0.006 255)" : "var(--primary)" }}
          >
            Далее
          </button>
        )}
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

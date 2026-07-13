"use client";

import { useRef, useState } from "react";
import { mmss } from "@/lib/format";

export type VoiceNoteValue = { id: string; durationLabel: string } | null;

export default function VoiceRecorder({
  value,
  onChange,
}: {
  value: VoiceNoteValue;
  onChange: (v: VoiceNoteValue) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const uploadVoice = async (blob: Blob, duration: number, fileName: string) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", blob, fileName);
    form.append("kind", "voice");
    form.append("duration", String(duration));
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        onChange({ id: data.id, durationLabel: mmss(data.duration) });
      }
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const duration = recordingSeconds;
        cleanup();
        setIsRecording(false);
        uploadVoice(blob, duration, "voice-note.webm");
      };
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordingError(null);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const e = err as { name?: string };
      const reason =
        e?.name === "NotAllowedError"
          ? "Доступ к микрофону запрещён (проверьте разрешения браузера)"
          : e?.name === "NotFoundError"
          ? "Микрофон не найден на устройстве"
          : "Не удалось получить доступ к микрофону";
      setRecordingError(reason);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      uploadVoice(file, audio.duration || 0, file.name);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      uploadVoice(file, 0, file.name);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  };

  const deleteVoiceNote = async () => {
    if (!value) return;
    await fetch(`/api/uploads/${value.id}`, { method: "DELETE" });
    onChange(null);
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3.5 rounded-[9px]" style={{ background: "oklch(0.95 0.05 25)" }}>
        <div
          className="w-[9px] h-[9px] rounded-full flex-none animate-pulse"
          style={{ background: "var(--danger)" }}
        />
        <div className="text-[13px] font-bold flex-1" style={{ color: "oklch(0.45 0.16 25)" }}>
          Идёт запись… {mmss(recordingSeconds)}
        </div>
        <button
          onClick={stopRecording}
          className="border-none cursor-pointer text-white font-bold text-[12.5px] py-2 px-3.5 rounded-lg"
          style={{ background: "var(--danger)" }}
        >
          ⏹ Стоп
        </button>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-[9px] border bg-white" style={{ borderColor: "var(--border)" }}>
        <audio controls src={`/api/files/${value.id}`} className="h-8 flex-1 min-w-0" />
        <span className="text-[11.5px] whitespace-nowrap" style={{ color: "var(--muted-2)" }}>
          {value.durationLabel}
        </span>
        <button
          onClick={deleteVoiceNote}
          className="flex-none border-none w-[26px] h-[26px] rounded-lg cursor-pointer text-[13px] font-bold"
          style={{ background: "oklch(0.95 0.05 25)", color: "var(--danger)" }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={startRecording}
          disabled={uploading}
          className="border border-dashed font-bold text-[13px] py-2.5 px-4 rounded-[9px] cursor-pointer flex items-center gap-2 disabled:opacity-60"
          style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", color: "var(--primary-dark)" }}
        >
          <span className="text-[15px]">🎙️</span> Записать сообщение
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={onFileSelected} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border bg-white font-bold text-[13px] py-2.5 px-4 rounded-[9px] cursor-pointer flex items-center gap-2 disabled:opacity-60"
          style={{ borderColor: "var(--border)", color: "oklch(0.4 0.015 255)" }}
        >
          <span className="text-[15px]">📁</span> Загрузить аудиофайл
        </button>
        {uploading && <span className="text-xs" style={{ color: "var(--muted)" }}>Загрузка…</span>}
      </div>
      {recordingError && (
        <div className="text-xs" style={{ color: "var(--danger)" }}>
          {recordingError} — можно загрузить готовый аудиофайл кнопкой выше.
        </div>
      )}
    </div>
  );
}

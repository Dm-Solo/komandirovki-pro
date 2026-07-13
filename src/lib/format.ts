export function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

export function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${fmtDateShort(start)} — ${fmtDateShort(end)}`;
}

export function mmss(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

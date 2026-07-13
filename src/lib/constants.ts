export const PURPOSE_LABELS: Record<string, string> = {
  conference: "Конференция",
  client: "Встреча с клиентом",
  training: "Обучение",
  other: "Другое",
};

export const CATEGORY_OPTIONS = ["Проживание", "Транспорт", "Питание", "Прочее"];

export const ATTACHMENT_TYPES = [
  { value: "ticket", label: "Билет / посадочный" },
  { value: "hotel", label: "Бронь отеля" },
  { value: "contract", label: "Договор" },
  { value: "other", label: "Другое" },
];

export const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "Черновик", bg: "oklch(0.95 0.005 255)", color: "oklch(0.45 0.01 255)" },
  pending: { label: "На согласовании", bg: "oklch(0.96 0.06 80)", color: "oklch(0.55 0.13 70)" },
  approved: { label: "Утверждён", bg: "oklch(0.95 0.05 150)", color: "oklch(0.5 0.13 150)" },
  rejected: { label: "Отклонён", bg: "oklch(0.95 0.05 25)", color: "oklch(0.55 0.16 25)" },
};

export const TRIP_STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "На согласовании", bg: "oklch(0.96 0.06 80)", color: "oklch(0.55 0.13 70)" },
  approved: { label: "Одобрено", bg: "oklch(0.95 0.05 150)", color: "oklch(0.5 0.13 150)" },
  rejected: { label: "Отклонено", bg: "oklch(0.95 0.05 25)", color: "oklch(0.55 0.16 25)" },
};

export const STEP_DOT: Record<string, string> = {
  done: "oklch(0.62 0.14 150)",
  pending: "oklch(0.75 0.14 80)",
  rejected: "oklch(0.58 0.18 25)",
  waiting: "oklch(0.85 0.006 255)",
};

export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const RECEIPT_TEMPLATES = [
  { merchant: "Отель «Байкал»", category: "Проживание", amount: 4800 },
  { merchant: "ООО «Аэрофлот»", category: "Транспорт", amount: 12300 },
  { merchant: "Кафе «Пассаж»", category: "Питание", amount: 850 },
  { merchant: "Такси Яндекс", category: "Транспорт", amount: 620 },
];

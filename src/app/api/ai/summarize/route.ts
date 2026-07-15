import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ATTACHMENT_TYPES, PURPOSE_LABELS } from "@/lib/constants";

const YANDEX_COMPLETION_URL = "https://ai.api.cloud.yandex.net/v1/chat/completions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const apiKey = process.env.YANDEX_AI_STUDIO_API_KEY;
  const folderId = process.env.YANDEX_AI_STUDIO_FOLDER_ID;
  if (!apiKey || !folderId) {
    return NextResponse.json(
      {
        error:
          "Yandex AI Studio не настроен. Добавьте переменные окружения YANDEX_AI_STUDIO_API_KEY и YANDEX_AI_STUDIO_FOLDER_ID, чтобы включить анализ ИИ.",
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const destination: string = body.destination || "—";
  const purpose: string = body.purpose || "other";
  const startDate: string = body.startDate || "—";
  const endDate: string = body.endDate || "—";
  const comment: string = body.comment || "—";
  const hasVoiceNote: boolean = !!body.hasVoiceNote;
  const receipts: { merchant: string; category: string; amount: number }[] = Array.isArray(body.receipts)
    ? body.receipts
    : [];
  const attachments: { name: string; fileType: string }[] = Array.isArray(body.attachments)
    ? body.attachments
    : [];

  const receiptsList =
    receipts
      .map((r) => `- ${r.merchant || "без названия"}, категория: ${r.category || "—"}, сумма: ${Number(r.amount) || 0} руб.`)
      .join("\n") || "нет чеков";

  const attachmentsList =
    attachments
      .map((a) => `- ${a.name} (тип: ${ATTACHMENT_TYPES.find((t) => t.value === a.fileType)?.label || a.fileType})`)
      .join("\n") || "нет файлов";

  const total = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const prompt =
    "Ты помощник по оформлению авансовых отчётов о командировках. На основе данных ниже сформируй краткий деловой отчёт о командировке для бухгалтерии на русском языке (3-5 предложений плюс краткий вывод по расходам). Пиши по-деловому, без воды.\n\n" +
    `Направление: ${destination}\n` +
    `Цель: ${PURPOSE_LABELS[purpose] || purpose}\n` +
    `Даты: ${startDate} — ${endDate}\n` +
    `Комментарий сотрудника: ${comment}\n` +
    `Голосовой комментарий приложен: ${hasVoiceNote ? "да" : "нет"}\n\n` +
    `Чеки:\n${receiptsList}\n\n` +
    `Приложенные файлы:\n${attachmentsList}\n\n` +
    `Итоговая сумма расходов: ${total} руб.`;

  try {
    const res = await fetch(YANDEX_COMPLETION_URL, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: `gpt://${folderId}/yandexgpt/latest`,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[yandex-ai-studio] completion failed", res.status, JSON.stringify(data));
      return NextResponse.json({ error: "Не удалось получить анализ ИИ. Попробуйте ещё раз." }, { status: 502 });
    }

    const summary: string = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[yandex-ai-studio] completion threw", err);
    return NextResponse.json({ error: "Не удалось получить анализ ИИ. Попробуйте ещё раз." }, { status: 502 });
  }
}

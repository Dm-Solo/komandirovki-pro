import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const YANDEX_STT_URL = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const apiKey = process.env.YANDEX_AI_STUDIO_API_KEY;
  const folderId = process.env.YANDEX_AI_STUDIO_FOLDER_ID;
  if (!apiKey || !folderId) {
    return NextResponse.json(
      { error: "Yandex AI Studio не настроен: нет YANDEX_AI_STUDIO_API_KEY / YANDEX_AI_STUDIO_FOLDER_ID" },
      { status: 503 }
    );
  }

  // Expects raw headerless 16-bit signed little-endian mono PCM (decoded and
  // resampled client-side via Web Audio API), matching Yandex SpeechKit's
  // lpcm format spec. The client picks 8000 or 16000 Hz depending on
  // duration to stay under the endpoint's 1MB request body limit.
  const rateParam = req.nextUrl.searchParams.get("sampleRateHertz");
  const sampleRateHertz = rateParam === "8000" || rateParam === "48000" ? rateParam : "16000";

  const pcm = Buffer.from(await req.arrayBuffer());
  if (pcm.length === 0) {
    return NextResponse.json({ error: "Пустой аудиофайл" }, { status: 400 });
  }
  if (pcm.length > 1_000_000) {
    return NextResponse.json({ error: "Аудиозапись слишком большая для распознавания (лимит 1 МБ)" }, { status: 400 });
  }

  const url = `${YANDEX_STT_URL}?lang=ru-RU&format=lpcm&sampleRateHertz=${sampleRateHertz}&folderId=${encodeURIComponent(folderId)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Api-Key ${apiKey}` },
      body: pcm,
    });
    const data = await res.json();
    if (!res.ok || data.error_code) {
      console.error("[yandex-stt] recognize failed", res.status, JSON.stringify(data));
      const reason = data.error_message || data.error_code || `HTTP ${res.status}`;
      return NextResponse.json({ error: `Не удалось распознать голосовое сообщение: ${reason}` }, { status: 502 });
    }
    return NextResponse.json({ text: data.result || "" });
  } catch (err) {
    console.error("[yandex-stt] recognize threw", err);
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Не удалось распознать голосовое сообщение: ${reason}` }, { status: 502 });
  }
}

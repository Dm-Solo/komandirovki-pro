import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const VIBE_BASE = "https://vibecode.bitrix24.tech";

type VibeMeResponse = {
  success: boolean;
  data?: { owner?: { userId?: string | number } };
  error?: { message?: string };
};

type VibeTaskResponse = {
  success: boolean;
  data?: { id?: number | string; title?: string };
  error?: { message?: string };
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const apiKey = process.env.VIBECODE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "VIBECODE_API_KEY не настроен. Добавьте переменную окружения VIBECODE_API_KEY, чтобы включить создание задач на портале.",
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
  }

  const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };

  try {
    const meRes = await fetch(`${VIBE_BASE}/v1/me`, { headers });
    const me = (await meRes.json()) as VibeMeResponse;
    if (!meRes.ok || !me.success || !me.data?.owner?.userId) {
      return NextResponse.json(
        { error: me.error?.message || "Не удалось подключиться к порталу Bitrix24" },
        { status: 502 }
      );
    }

    const taskPayload: Record<string, unknown> = {
      title,
      responsibleId: Number(me.data.owner.userId),
    };
    if (body.description) taskPayload.description = String(body.description);
    if (body.deadline) {
      const deadline = new Date(body.deadline);
      if (!isNaN(deadline.getTime())) taskPayload.deadline = deadline.toISOString();
    }
    if (body.priority !== undefined && body.priority !== "") {
      taskPayload.priority = Number(body.priority);
    }

    const taskRes = await fetch(`${VIBE_BASE}/v1/tasks`, {
      method: "POST",
      headers,
      body: JSON.stringify(taskPayload),
    });
    const taskData = (await taskRes.json()) as VibeTaskResponse;

    if (!taskRes.ok || !taskData.success) {
      return NextResponse.json(
        { error: taskData.error?.message || "Не удалось создать задачу на портале" },
        { status: taskRes.status || 502 }
      );
    }

    return NextResponse.json({ task: taskData.data });
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с порталом Bitrix24" }, { status: 502 });
  }
}

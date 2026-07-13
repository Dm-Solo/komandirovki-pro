import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const { id } = await params;
  const trip = getTrip(user.id, id);
  if (!trip) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  return NextResponse.json({ trip });
}

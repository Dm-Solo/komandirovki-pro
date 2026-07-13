import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createTrip, listTrips } from "@/lib/data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  return NextResponse.json({ trips: listTrips(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json();
  const trip = createTrip(user.id, {
    destination: String(body.destination || ""),
    purpose: String(body.purpose || "other"),
    startDate: String(body.startDate || ""),
    endDate: String(body.endDate || ""),
    estimatedBudget: Number(body.estimatedBudget) || 0,
    comment: String(body.comment || ""),
  });
  return NextResponse.json({ trip });
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTrips } from "@/lib/data";
import TripCard from "@/components/TripCard";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const trips = listTrips(user.id);

  return (
    <div className="p-4.5 md:p-8 max-w-[920px] mx-auto pb-16 md:pb-12">
      <div className="flex items-start justify-between gap-3 mb-5.5 flex-wrap">
        <div>
          <div className="text-[22px] font-extrabold tracking-tight">Планирование поездок</div>
          <div className="text-[13.5px] mt-1" style={{ color: "var(--muted)" }}>
            Предстоящих командировок: {trips.length}
          </div>
        </div>
        <Link
          href="/trips/new"
          className="border-none cursor-pointer text-white font-bold text-[13.5px] py-2.5 px-4.5 rounded-[10px] shadow-md whitespace-nowrap"
          style={{ background: "var(--primary)" }}
        >
          + Добавить
        </Link>
      </div>

      {trips.length === 0 ? (
        <div
          className="border-[1.5px] border-dashed rounded-2xl py-9 px-5 text-center text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}
        >
          Предстоящих командировок пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </div>
      )}
    </div>
  );
}

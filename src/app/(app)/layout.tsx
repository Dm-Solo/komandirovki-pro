import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar, MobileTopBar, MobileBottomNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userInitials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="h-screen w-full flex" style={{ background: "var(--surface)" }}>
      <Sidebar userName={user.name} userRole={user.role} userInitials={userInitials} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileTopBar />
        <div className="flex-1 overflow-y-auto">{children}</div>
        <MobileBottomNav />
      </div>
    </div>
  );
}

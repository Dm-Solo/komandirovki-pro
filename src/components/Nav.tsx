"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type UserInfo = {
  userName: string;
  userRole: string;
  userInitials: string;
};

const NAV_ITEMS = [
  { href: "/calendar", label: "Календарь", match: ["/calendar"] },
  { href: "/trips", label: "Планирование поездок", match: ["/trips"] },
  { href: "/", label: "Мои отчёты", match: ["/", "/reports"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}

export function Sidebar({ userName, userRole, userInitials }: UserInfo) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <div
      className="hidden md:flex w-[236px] flex-none border-r flex-col py-5.5 px-4 bg-white"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2.5 px-2 pb-5.5">
        <div
          className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center text-white font-extrabold text-[11px] leading-none"
          style={{ background: "var(--primary)" }}
        >
          Yo
        </div>
        <div className="font-extrabold text-[15px] tracking-tight">КомандировкиPro</div>
      </div>
      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-[9px] font-bold text-[13.5px]"
              style={
                active
                  ? { background: "var(--primary-soft)", color: "var(--primary-dark)" }
                  : { color: "var(--ink)" }
              }
            >
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: active ? "var(--primary)" : "transparent" }}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="flex-1" />
      <div
        className="flex items-center gap-2.5 py-2.5 px-2 border-t"
        style={{ borderColor: "oklch(0.93 0.006 255)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12.5px] flex-none"
          style={{ background: "oklch(0.9 0.02 258)", color: "var(--primary-dark)" }}
        >
          {userInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate">{userName}</div>
          <div className="text-[11.5px] truncate" style={{ color: "var(--muted)" }}>
            {userRole}
          </div>
        </div>
        <button
          onClick={logout}
          title="Выйти"
          className="flex-none border-none w-7 h-7 rounded-lg cursor-pointer text-[13px]"
          style={{ background: "oklch(0.95 0.005 255)", color: "var(--muted)" }}
        >
          ⏻
        </button>
      </div>
    </div>
  );
}

export function MobileTopBar() {
  const logout = useLogout();
  return (
    <div
      className="md:hidden h-[52px] flex-none flex items-center px-4 border-b bg-white gap-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="w-6 h-6 rounded-[7px] flex items-center justify-center text-white font-extrabold text-[9px] leading-none"
        style={{ background: "var(--primary)" }}
      >
        Yo
      </div>
      <div className="font-extrabold text-[13.5px]">КомандировкиPro</div>
      <div className="flex-1" />
      <button onClick={logout} className="border-none bg-transparent text-[12px] font-bold" style={{ color: "var(--muted)" }}>
        Выйти
      </button>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/calendar", icon: "📅", label: "Планы", match: ["/calendar", "/trips"] },
    { href: "/", icon: "📋", label: "Отчёты", match: ["/", "/reports"] },
    { href: "/reports/new", icon: "➕", label: "Новый", match: ["/reports/new"] },
  ];
  return (
    <div
      className="md:hidden h-[58px] flex-none flex items-center justify-around border-t bg-white"
      style={{ borderColor: "var(--border)" }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5"
            style={{ color: active ? "var(--primary-dark)" : "oklch(0.6 0.015 255)" }}
          >
            <div className="text-base">{item.icon}</div>
            <div className="text-[10.5px] font-bold">{item.label}</div>
          </Link>
        );
      })}
    </div>
  );
}

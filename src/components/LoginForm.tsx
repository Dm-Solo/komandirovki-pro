"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setLogin("");
    setPassword("");
    setName("");
    setConfirmPassword("");
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login" ? { login, password } : { login, password, name, confirmPassword };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Что-то пошло не так");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером");
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[380px]">
      <div className="flex items-center gap-2.5 justify-center mb-6">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white font-extrabold text-[12px] leading-none"
          style={{ background: "var(--primary)" }}
        >
          Yo
        </div>
        <div className="font-extrabold text-[17px] tracking-tight">КомандировкиPro</div>
      </div>

      <div className="bg-white border rounded-2xl p-7 shadow-sm" style={{ borderColor: "var(--border)" }}>
        {mode === "login" ? (
          <>
            <div className="text-lg font-extrabold mb-1">Вход в систему</div>
            <div className="text-[12.5px] mb-5" style={{ color: "var(--muted)" }}>
              Введите логин и пароль
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-extrabold mb-1">Регистрация</div>
            <div className="text-[12.5px] mb-5" style={{ color: "var(--muted)" }}>
              Создайте логин и пароль
            </div>
          </>
        )}

        <div className="flex flex-col gap-3.5">
          {mode === "register" && (
            <Field label="Имя">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="input"
              />
            </Field>
          )}
          <Field label="Логин">
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="anna"
              className="input"
            />
          </Field>
          <Field label="Пароль">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </Field>
          {mode === "register" && (
            <Field label="Повторите пароль">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </Field>
          )}

          {error && (
            <div className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="border-none cursor-pointer text-white font-bold text-[13.5px] py-3 px-4.5 rounded-[10px] shadow-md disabled:opacity-60"
            style={{ background: "var(--primary)" }}
          >
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>

          {mode === "login" ? (
            <>
              <div className="text-[12.5px] text-center mt-0.5" style={{ color: "var(--muted)" }}>
                Тестовый доступ: anna / 12345
              </div>
              <div className="text-[12.5px] text-center" style={{ color: "var(--muted)" }}>
                Нет аккаунта?{" "}
                <button onClick={() => switchMode("register")} className="link">
                  Зарегистрироваться
                </button>
              </div>
            </>
          ) : (
            <div className="text-[12.5px] text-center" style={{ color: "var(--muted)" }}>
              Уже есть аккаунт?{" "}
              <button onClick={() => switchMode("login")} className="link">
                Войти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12.5px] font-bold mb-1.5" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

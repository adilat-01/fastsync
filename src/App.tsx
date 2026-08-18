import { useState } from "react";
import { hasSupabaseConfig } from "./lib/supabase";
import { SessionProvider, useSession } from "./session";
import { AuthScreen } from "./screens/AuthScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { QuickAddScreen } from "./screens/QuickAddScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type Tab = "add" | "dash" | "history" | "settings";

export function App() {
  if (!hasSupabaseConfig) return <MissingConfig />;
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}

function Shell() {
  const { ready, user, household, error } = useSession();
  const [tab, setTab] = useState<Tab>("add");

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-stone-500">טוען את הבית...</div>
    );
  }
  if (!user) return <AuthScreen />;
  if (!household) return <OnboardingScreen />;

  return (
    <div className="min-h-dvh">
      {error && <p className="bg-orange-50 px-4 py-2 text-center text-xs text-burn">{error}</p>}
      {tab === "add" && <QuickAddScreen />}
      {tab === "dash" && <DashboardScreen />}
      {tab === "history" && <HistoryScreen />}
      {tab === "settings" && <SettingsScreen />}
      <nav className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <NavBtn current={tab === "add"} onClick={() => setTab("add")} label="הוצאה" />
          <NavBtn current={tab === "dash"} onClick={() => setTab("dash")} label="מצב" />
          <NavBtn current={tab === "history"} onClick={() => setTab("history")} label="היסטוריה" />
          <NavBtn current={tab === "settings"} onClick={() => setTab("settings")} label="בית" />
        </div>
      </nav>
    </div>
  );
}

function NavBtn({
  current,
  onClick,
  label,
}: {
  current: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-2 text-sm font-semibold ${current ? "text-accent" : "text-stone-400"}`}
    >
      {label}
    </button>
  );
}

function MissingConfig() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-extrabold text-ink">חסר חיבור ל-Supabase</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        צרו קובץ <code className="rounded bg-white px-1">.env</code> לפי{" "}
        <code className="rounded bg-white px-1">.env.example</code> עם{" "}
        <code className="rounded bg-white px-1">VITE_SUPABASE_URL</code> ו-
        <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code>, ואז הריצו מחדש{" "}
        <code className="rounded bg-white px-1">npm run dev</code>.
      </p>
      <p className="mt-3 text-sm text-stone-600">ההוראות המלאות ב-README.md.</p>
    </div>
  );
}

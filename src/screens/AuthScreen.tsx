import { useState, type FormEvent } from "react";
import { useSession } from "../session";

export function AuthScreen() {
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "in") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim() || email.split("@")[0]);
        setMessage("נרשמת. אם האימות במייל דלוק בפרויקט — בדקי את תיבת הדואר ואז היכנסי.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בהתחברות");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <p className="text-sm font-medium text-accent">FastSync</p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink">
        חשבון אחד.
        <br />
        תמונה אחת של החודש.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600">
        הוצאות, הוראות קבע והכנסות של שניכם — בלי לחלק מי שילם. הזנה בתוך שניות מהטלפון.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "up" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">שם</span>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="השם שלך"
              autoComplete="name"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">אימייל</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            dir="ltr"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">סיסמה</span>
          <input
            className="field"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="לפחות 6 תווים"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            dir="ltr"
          />
        </label>
        <button className="btn-primary mt-2 w-full" disabled={busy} type="submit">
          {busy ? "רגע..." : mode === "in" ? "כניסה" : "הרשמה"}
        </button>
      </form>

      <button
        className="mt-4 text-sm text-stone-600 underline-offset-4 hover:underline"
        type="button"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setMessage(null);
        }}
      >
        {mode === "in" ? "אין חשבון? הרשמה" : "יש חשבון? כניסה"}
      </button>
      {message && <p className="mt-4 text-sm leading-relaxed text-burn">{message}</p>}
    </div>
  );
}

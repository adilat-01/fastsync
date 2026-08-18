import { useState, type FormEvent } from "react";
import { useSession } from "../session";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import type { TxCategory } from "../types";

type Draft = { description: string; amount: string; category: TxCategory };

export function OnboardingScreen() {
  const { createHousehold, joinHousehold, addTemplate, refresh } = useSession();
  const [step, setStep] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("הבית שלנו");
  const [code, setCode] = useState("");
  const [incomes, setIncomes] = useState<Draft[]>([
    { description: "משכורת", amount: "", category: "salary" },
  ]);
  const [bills, setBills] = useState<Draft[]>([
    { description: "שכר דירה", amount: "", category: "bills" },
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await joinHousehold(code);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "קוד לא תקין");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await createHousehold(name);
      const recurring = [
        ...incomes
          .filter((row) => Number(row.amount) > 0)
          .map((row) => ({
            type: "income" as const,
            amount: Number(row.amount),
            category: "salary" as const,
            description: row.description || "הכנסה",
          })),
        ...bills
          .filter((row) => Number(row.amount) > 0)
          .map((row) => ({
            type: "expense" as const,
            amount: Number(row.amount),
            category: row.category,
            description: row.description || "הוראת קבע",
          })),
      ];
      for (const row of recurring) {
        await addTemplate(row);
      }
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "לא הצלחנו ליצור בית");
    } finally {
      setBusy(false);
    }
  }

  if (step === "choose") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-3xl font-extrabold text-ink">משק הבית</h1>
        <p className="mt-2 text-stone-600">יצירה חד-פעמית, ואז שניכם רואים את אותו החודש.</p>
        <div className="mt-8 grid gap-3">
          <button className="btn-primary" type="button" onClick={() => setStep("create")}>
            יצירת בית חדש
          </button>
          <button className="btn-ghost" type="button" onClick={() => setStep("join")}>
            הצטרפות עם קוד
          </button>
        </div>
      </div>
    );
  }

  if (step === "join") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <button className="self-start text-sm text-stone-500" type="button" onClick={() => setStep("choose")}>
          חזרה
        </button>
        <h1 className="mt-4 text-3xl font-extrabold text-ink">קוד הזמנה</h1>
        <form onSubmit={onJoin} className="mt-6 space-y-3">
          <input
            className="field text-center text-2xl tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            dir="ltr"
            required
          />
          <button className="btn-primary w-full" disabled={busy} type="submit">
            {busy ? "מצטרפים..." : "הצטרפות"}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-burn">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <button className="text-sm text-stone-500" type="button" onClick={() => setStep("choose")}>
        חזרה
      </button>
      <h1 className="mt-4 text-3xl font-extrabold text-ink">הבסיס החודשי</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        משכורות והוראות קבע נכנסות לבד ב-1 לחודש. אפשר לדלג על שורה ולהוסיף אחר כך.
      </p>
      <form onSubmit={onCreate} className="mt-6 space-y-6 pb-24">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500">שם הבית</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <section>
          <h2 className="text-sm font-bold text-ink">הכנסות קבועות</h2>
          <div className="mt-2 space-y-2">
            {incomes.map((row, i) => (
              <div className="grid grid-cols-[1fr_7rem] gap-2" key={`in-${i}`}>
                <input
                  className="field"
                  value={row.description}
                  onChange={(e) =>
                    setIncomes((rows) => rows.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r)))
                  }
                  placeholder="משכורת"
                />
                <input
                  className="field"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) =>
                    setIncomes((rows) => rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))
                  }
                  placeholder="₪"
                />
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-sm text-accent"
            type="button"
            onClick={() => setIncomes((rows) => [...rows, { description: "", amount: "", category: "salary" }])}
          >
            + הכנסה
          </button>
        </section>

        <section>
          <h2 className="text-sm font-bold text-ink">הוראות קבע</h2>
          <div className="mt-2 space-y-2">
            {bills.map((row, i) => (
              <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3" key={`bill-${i}`}>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <input
                    className="field"
                    value={row.description}
                    onChange={(e) =>
                      setBills((rows) => rows.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r)))
                    }
                    placeholder="שכר דירה, ארנונה..."
                  />
                  <input
                    className="field"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) =>
                      setBills((rows) => rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))
                    }
                    placeholder="₪"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setBills((rows) => rows.map((r, idx) => (idx === i ? { ...r, category: cat.id } : r)))
                      }
                      className={`chip ${row.category === cat.id ? "chip-on" : ""}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-2 text-sm text-accent"
            type="button"
            onClick={() =>
              setBills((rows) => [...rows, { description: "", amount: "", category: "bills" }])
            }
          >
            + הוראת קבע
          </button>
        </section>

        {message && <p className="text-sm text-burn">{message}</p>}
        <button className="btn-primary w-full" disabled={busy} type="submit">
          {busy ? "שומרים..." : "שמירה והתחלה"}
        </button>
      </form>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { useSession } from "../session";
import { EXPENSE_CATEGORIES, categoryLabel } from "../lib/categories";
import { computeCushion } from "../lib/cushion";
import { formatMoney } from "../lib/format";
import type { Household, TxCategory } from "../types";

export function SettingsScreen() {
  const {
    household,
    members,
    templates,
    transactions,
    addTemplate,
    toggleTemplate,
    deleteTemplate,
    setOpeningBalance,
    signOut,
  } = useSession();
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TxCategory>("bills");
  const [copied, setCopied] = useState(false);
  const [cushionInput, setCushionInput] = useState(
    household?.opening_balance != null ? String(household.opening_balance) : "",
  );
  const [cushionBusy, setCushionBusy] = useState(false);
  const [cushionMsg, setCushionMsg] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    await addTemplate({
      type: kind,
      amount: value,
      category: kind === "income" ? "salary" : category,
      description: description.trim() || (kind === "income" ? "הכנסה" : "הוראת קבע"),
    });
    setDescription("");
    setAmount("");
  }

  async function copyCode() {
    if (!household) return;
    await navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="text-2xl font-extrabold text-ink">הגדרות הבית</h1>

      <section className="card mt-4 p-4">
        <p className="text-xs text-stone-500">קוד הזמנה לבן/בת הזוג</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-2xl font-extrabold tracking-[0.25em] text-ink" dir="ltr">
            {household?.invite_code}
          </p>
          <button className="btn-ghost px-3 py-2 text-sm" type="button" onClick={copyCode}>
            {copied ? "הועתק" : "העתקה"}
          </button>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          חברים בבית: {members.map((m) => m.display_name || "שותף").join(" · ") || "רק את/ה בינתיים"}
        </p>
      </section>

      <CushionCard
        household={household}
        cushionInput={cushionInput}
        setCushionInput={setCushionInput}
        cushionBusy={cushionBusy}
        cushionMsg={cushionMsg}
        onSave={async () => {
          const value = Number(cushionInput);
          if (cushionInput.trim() === "" || !Number.isFinite(value)) return;
          setCushionBusy(true);
          setCushionMsg(null);
          try {
            await setOpeningBalance(value);
            setCushionMsg("נשמר. מכאן כל תנועה מעדכנת את הכרית.");
          } catch (err) {
            setCushionMsg(err instanceof Error ? err.message : "שגיאה");
          } finally {
            setCushionBusy(false);
          }
        }}
        currentCushion={computeCushion(
          household?.opening_balance,
          household?.opening_set_at,
          transactions,
        )}
      />

      <section className="mt-6">
        <h2 className="text-sm font-bold text-ink">הוראות קבע והכנסות</h2>
        <p className="mt-1 text-xs text-stone-500">
          ב-1 לחודש (וגם בפתיחת האפליקציה) הרשומות האלה נכנסות אוטומטית להיסטוריה.
        </p>
        <ul className="mt-3 space-y-2">
          {templates.map((t) => (
            <li className="card flex items-center gap-3 p-3" key={t.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{t.description}</p>
                <p className="text-xs text-stone-500">
                  {t.type === "income" ? "הכנסה" : categoryLabel(t.category)} · {formatMoney(Number(t.amount))}
                  {t.active ? "" : " · כבוי"}
                </p>
              </div>
              <button
                className="text-xs text-stone-500"
                type="button"
                onClick={() => toggleTemplate(t.id, !t.active)}
              >
                {t.active ? "כיבוי" : "הפעלה"}
              </button>
              <button className="text-xs text-burn" type="button" onClick={() => deleteTemplate(t.id)}>
                מחיקה
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={onAdd} className="card mt-4 space-y-3 p-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip ${kind === "expense" ? "chip-on" : ""}`}
              onClick={() => setKind("expense")}
            >
              הוצאה קבועה
            </button>
            <button
              type="button"
              className={`chip ${kind === "income" ? "chip-on" : ""}`}
              onClick={() => setKind("income")}
            >
              הכנסה קבועה
            </button>
          </div>
          <input
            className="field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "income" ? "משכורת" : "שכר דירה, אינטרנט..."}
          />
          <input
            className="field"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="סכום ₪"
          />
          {kind === "expense" && (
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`chip ${category === cat.id ? "chip-on" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
          <button className="btn-primary w-full" type="submit">
            הוספה לרשימת הקבע
          </button>
        </form>
      </section>

      <button className="mt-8 text-sm text-stone-500 underline-offset-4 hover:underline" type="button" onClick={signOut}>
        יציאה מהחשבון
      </button>
    </div>
  );
}

function CushionCard({
  household,
  cushionInput,
  setCushionInput,
  cushionBusy,
  cushionMsg,
  onSave,
  currentCushion,
}: {
  household: Household | null;
  cushionInput: string;
  setCushionInput: (v: string) => void;
  cushionBusy: boolean;
  cushionMsg: string | null;
  onSave: () => Promise<void>;
  currentCushion: number | null;
}) {
  return (
    <section className="card mt-4 p-4">
      <h2 className="text-sm font-bold text-ink">כרית חיסכון · יתרת עו״ש</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        כמה יש בחשבון המשותף עכשיו לפי הבנק. מגדירים פעם אחת (או כשרוצים ליישר מול הבנק). מכאן כל הכנסה —
        כולל חד-פעמית — מעלה, וכל הוצאה מהקופה מורידה. הוצאה מחשבון אישי לא משנה את המספר הזה.
      </p>
      {currentCushion != null && (
        <p className="mt-3 text-lg font-extrabold tabular-nums text-accent">{formatMoney(currentCushion)}</p>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <input
          className="field"
          inputMode="decimal"
          value={cushionInput}
          onChange={(e) => setCushionInput(e.target.value.replace(/[^\d.-]/g, ""))}
          placeholder="לדוגמה 400"
        />
        <button className="btn-primary shrink-0 px-4" disabled={cushionBusy} type="submit">
          {cushionBusy ? "..." : household?.opening_set_at ? "עדכון" : "שמירה"}
        </button>
      </form>
      {cushionMsg && <p className="mt-2 text-xs text-stone-500">{cushionMsg}</p>}
    </section>
  );
}

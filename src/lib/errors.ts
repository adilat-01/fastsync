import type { PostgrestError } from "@supabase/supabase-js";

export function formatDbError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (!err || typeof err !== "object") return "שגיאה לא ידועה";
  const e = err as PostgrestError & { status?: number };
  if (e.code === "PGRST301" || e.message?.toLowerCase().includes("jwt")) {
    return "פג תוקף ההתחברות. צאי מהחשבון והיכנסי מחדש.";
  }
  if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")) {
    return "אין חיבור לשרת. ייתכן שפרויקט Supabase נרדם — פתחי אותו ב-dashboard והקישי Restore.";
  }
  if (e.code === "22P02" && e.message?.includes("dining")) {
    return "חסרה קטגוריה במסד הנתונים. הריצי migration_catchup.sql ב-Supabase.";
  }
  if (isSchemaMismatchError(e)) {
    return "המסד לא מעודכן. הריצי migration_catchup.sql ב-Supabase → SQL Editor.";
  }
  return e.message || e.details || "שגיאה בטעינה";
}

export function isSchemaMismatchError(err: { code?: string; message?: string }): boolean {
  if (err.code === "PGRST204" || err.code === "42703") return true;
  const msg = err.message?.toLowerCase() ?? "";
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("could not find"));
}

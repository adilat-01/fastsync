import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Household, Profile, RecurringTemplate, Transaction, TxCategory, TxType, PaidFrom } from "./types";
import { formatDbError, isSchemaMismatchError } from "./lib/errors";
import {
  normalizeHousehold,
  normalizeProfile,
  normalizeTemplate,
  normalizeTransaction,
} from "./lib/normalize";
import { monthKey, parseMonthKey, todayISO } from "./lib/format";

type SessionValue = {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  household: Household | null;
  members: Profile[];
  transactions: Transaction[];
  templates: RecurringTemplate[];
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  addTransaction: (input: {
    type: TxType;
    amount: number;
    category: TxCategory;
    description: string;
    occurred_on?: string;
    paid_from?: PaidFrom;
    paid_by?: string | null;
  }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addTemplate: (input: {
    type: TxType;
    amount: number;
    category: TxCategory;
    description: string;
  }) => Promise<void>;
  toggleTemplate: (id: string, active: boolean) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setOpeningBalance: (amount: number) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHouseholdData = useCallback(async (userId: string) => {
    if (!supabase) return;

    let { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id, household_id, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profileRow) {
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({ id: userId, display_name: "" })
        .select("id, household_id, display_name")
        .single();
      if (createError) throw createError;
      profileRow = created;
    }
    setProfile(normalizeProfile(profileRow as Record<string, unknown>));

    if (!profileRow.household_id) {
      setHousehold(null);
      setMembers([]);
      setTransactions([]);
      setTemplates([]);
      return;
    }

    const { error: rpcError } = await supabase.rpc("ensure_recurring_for_current_month");
    if (rpcError) {
      console.warn("ensure_recurring_for_current_month:", rpcError.message);
    }

    let houseRes = await supabase
      .from("households")
      .select("id, name, invite_code, opening_balance, opening_set_at")
      .eq("id", profileRow.household_id)
      .single();

    if (houseRes.error && isSchemaMismatchError(houseRes.error)) {
      houseRes = await supabase
        .from("households")
        .select("id, name, invite_code")
        .eq("id", profileRow.household_id)
        .single();
    }

    const [memberRes, txRes, tmplRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, household_id, display_name")
        .eq("household_id", profileRow.household_id),
      supabase
        .from("transactions")
        .select("*")
        .eq("household_id", profileRow.household_id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("recurring_templates")
        .select("*")
        .eq("household_id", profileRow.household_id)
        .order("created_at", { ascending: true }),
    ]);

    if (houseRes.error) throw houseRes.error;
    if (memberRes.error) throw memberRes.error;
    if (txRes.error) throw txRes.error;
    if (tmplRes.error) throw tmplRes.error;

    setHousehold(normalizeHousehold(houseRes.data as Record<string, unknown>));
    setMembers((memberRes.data ?? []).map((row) => normalizeProfile(row as Record<string, unknown>)));
    setTransactions((txRes.data ?? []).map((row) => normalizeTransaction(row as Record<string, unknown>)));
    setTemplates((tmplRes.data ?? []).map((row) => normalizeTemplate(row as Record<string, unknown>)));
  }, []);

  const thisMonth = parseMonthKey(monthKey(new Date()));

  const removePostedThisMonth = useCallback(async (templateId: string) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("recurring_template_id", templateId)
      .gte("occurred_on", thisMonth.start)
      .lte("occurred_on", thisMonth.end);
    if (deleteError) throw deleteError;
  }, [thisMonth.end, thisMonth.start]);

  const postTemplateThisMonth = useCallback(
    async (
      template: Pick<RecurringTemplate, "id" | "type" | "amount" | "category" | "description">,
      householdId: string,
      userId: string,
    ) => {
      if (!supabase) return;
      const { error: insertError } = await supabase.from("transactions").insert({
        household_id: householdId,
        created_by: userId,
        type: template.type,
        amount: template.amount,
        category: template.category,
        description: template.description,
        occurred_on: thisMonth.start,
        recurring_template_id: template.id,
        paid_from: "shared",
        paid_by: null,
      });
      if (insertError && insertError.code !== "23505") throw insertError;
    },
    [thisMonth.start],
  );

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    setError(null);
    try {
      await supabase.auth.refreshSession();
      await loadHouseholdData(user.id);
      setError(null);
    } catch (err) {
      setError(formatDbError(err));
      throw err;
    }
  }, [loadHouseholdData, user]);

  const safeLoad = useCallback(
    async (userId: string) => {
      try {
        await supabase?.auth.refreshSession();
        await loadHouseholdData(userId);
        setError(null);
      } catch (err) {
        setError(formatDbError(err));
      }
    },
    [loadHouseholdData],
  );

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      try {
        if (nextUser) await loadHouseholdData(nextUser.id);
        setError(null);
      } catch (err) {
        setError(formatDbError(err));
      } finally {
        setReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        safeLoad(nextUser.id);
      } else {
        setProfile(null);
        setHousehold(null);
        setMembers([]);
        setTransactions([]);
        setTemplates([]);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadHouseholdData, safeLoad]);

  useEffect(() => {
    const client = supabase;
    if (!client || !household || !user) return;
    const userId = user.id;
    const channel = client
      .channel(`tx-${household.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          safeLoad(userId);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [household, safeLoad, user]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      user,
      profile,
      household,
      members,
      transactions,
      templates,
      error,
      refresh,
      signIn: async (email, password) => {
        if (!supabase) throw new Error("חסר חיבור ל-Supabase");
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) throw new Error("חסר חיבור ל-Supabase");
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (authError) throw authError;
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
      createHousehold: async (name) => {
        if (!supabase) throw new Error("חסר חיבור ל-Supabase");
        const { error: rpcError } = await supabase.rpc("create_household", { p_name: name });
        if (rpcError) throw rpcError;
        if (user) await loadHouseholdData(user.id);
      },
      joinHousehold: async (code) => {
        if (!supabase) throw new Error("חסר חיבור ל-Supabase");
        const { error: rpcError } = await supabase.rpc("join_household", { p_code: code });
        if (rpcError) throw rpcError;
        if (user) await loadHouseholdData(user.id);
      },
      addTransaction: async (input) => {
        if (!supabase || !household || !user) throw new Error("אין משק בית פעיל");
        const base = {
          household_id: household.id,
          created_by: user.id,
          type: input.type,
          amount: input.amount,
          category: input.category,
          description: input.description.trim() || (input.type === "income" ? "הכנסה" : "הוצאה"),
          occurred_on: input.occurred_on ?? todayISO(),
        };
        const withWallet =
          input.type === "expense"
            ? {
                ...base,
                paid_from: input.paid_from ?? "shared",
                paid_by: input.paid_from === "personal" ? (input.paid_by ?? user.id) : null,
              }
            : base;

        let { error: insertError } = await supabase.from("transactions").insert(withWallet);
        if (insertError && isSchemaMismatchError(insertError)) {
          ({ error: insertError } = await supabase.from("transactions").insert(base));
        }
        if (insertError) throw new Error(formatDbError(insertError));

        try {
          await loadHouseholdData(user.id);
          setError(null);
        } catch (reloadErr) {
          const msg = formatDbError(reloadErr);
          setError(`${msg} (ייתכן שהרשומה נשמרה — נסי «רענון»)`);
        }
      },
      deleteTransaction: async (id) => {
        if (!supabase || !user) return;
        const { error: deleteError } = await supabase.from("transactions").delete().eq("id", id);
        if (deleteError) throw deleteError;
        await loadHouseholdData(user.id);
      },
      addTemplate: async (input) => {
        if (!supabase || !household || !user) throw new Error("אין משק בית פעיל");
        const { data: created, error: insertError } = await supabase
          .from("recurring_templates")
          .insert({
            household_id: household.id,
            type: input.type,
            amount: input.amount,
            category: input.category,
            description: input.description.trim(),
            active: true,
          })
          .select("id, type, amount, category, description")
          .single();
        if (insertError) throw insertError;
        if (created) await postTemplateThisMonth(created, household.id, user.id);
        await loadHouseholdData(user.id);
      },
      toggleTemplate: async (id, active) => {
        if (!supabase || !household || !user) return;
        const { error: updateError } = await supabase
          .from("recurring_templates")
          .update({ active })
          .eq("id", id);
        if (updateError) throw updateError;
        if (!active) {
          await removePostedThisMonth(id);
        } else {
          const current = templates.find((t) => t.id === id);
          if (current) await postTemplateThisMonth(current, household.id, user.id);
        }
        await loadHouseholdData(user.id);
      },
      deleteTemplate: async (id) => {
        if (!supabase || !user) return;
        await removePostedThisMonth(id);
        const { error: deleteError } = await supabase.from("recurring_templates").delete().eq("id", id);
        if (deleteError) throw deleteError;
        await loadHouseholdData(user.id);
      },
      setOpeningBalance: async (amount) => {
        if (!supabase || !household || !user) throw new Error("אין משק בית פעיל");
        const { error: updateError } = await supabase
          .from("households")
          .update({
            opening_balance: amount,
            opening_set_at: new Date().toISOString(),
          })
          .eq("id", household.id);
        if (updateError) throw updateError;
        await loadHouseholdData(user.id);
      },
    }),
    [error, household, loadHouseholdData, members, postTemplateThisMonth, profile, ready, refresh, removePostedThisMonth, safeLoad, templates, transactions, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

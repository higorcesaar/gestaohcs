import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useClosedMonths() {
  const { user } = useAuth();
  const [closedMonths, setClosedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setClosedMonths([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("closed_months")
      .select("competence_month")
      .order("competence_month");
    if (error) toast.error(error.message);
    setClosedMonths(((data ?? []) as { competence_month: string }[]).map((r) => r.competence_month));
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const isClosed = useCallback(
    (month: string) => closedMonths.includes(month),
    [closedMonths],
  );

  const close = useCallback(async (month: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("closed_months")
      .insert({ user_id: user.id, competence_month: month });
    if (error) { toast.error(error.message); return; }
    toast.success("Fatura marcada como paga");
    reload();
  }, [user, reload]);

  const reopen = useCallback(async (month: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("closed_months")
      .delete()
      .eq("competence_month", month);
    if (error) { toast.error(error.message); return; }
    toast.success("Fatura reaberta");
    reload();
  }, [user, reload]);

  return { closedMonths, isClosed, close, reopen, loading, reload };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SEED_CATEGORIES } from "@/lib/finance-constants";

export interface Category {
  id: string;
  user_id: string;
  kind: string;
  name: string;
}

let seededOnce = false;

export function useCategories(kind?: string) {
  const { user } = useAuth();
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("categories").select("*").order("name");
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    setList((data ?? []) as Category[]);
    setLoading(false);
  }, [user, kind]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (!seededOnce) {
        seededOnce = true;
        const { count } = await supabase
          .from("categories")
          .select("id", { count: "exact", head: true });
        if ((count ?? 0) === 0) {
          const rows = Object.entries(SEED_CATEGORIES).flatMap(([k, names]) =>
            names.map((name) => ({ user_id: user.id, kind: k, name })),
          );
          await supabase.from("categories").insert(rows);
        }
      }
      load();
    })();
  }, [user, load]);

  return { list, loading, reload: load };
}

/** Insert if not exists, return canonical name */
export async function ensureCategory(userId: string, kind: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const { data: existing } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .eq("kind", kind)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing?.name) return existing.name;
  const { data } = await supabase
    .from("categories")
    .insert({ user_id: userId, kind, name: trimmed })
    .select("name")
    .single();
  return data?.name ?? trimmed;
}

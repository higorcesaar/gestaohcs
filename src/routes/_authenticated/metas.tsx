import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/metas")({
  component: Metas,
});

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

function Metas() {
  const { user } = useAuth();
  const [list, setList] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("goals").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data ?? []) as Goal[]);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const t = Number(target.replace(",", "."));
    const c = Number((current || "0").replace(",", "."));
    if (!name || !t) { toast.error("Informe nome e valor alvo"); return; }
    const { error } = await supabase.from("goals").insert({
      user_id: user.id, name, target_amount: t, current_amount: c,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Meta criada");
    setName(""); setTarget(""); setCurrent("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); load(); }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Metas</h1>
        <p className="text-muted-foreground">Acompanhe a evolução dos seus objetivos.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Nova meta</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Poupança" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor alvo (R$)</Label>
              <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Já alcançado (R$)</Label>
              <Input inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit">Adicionar meta</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Suas metas</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
          ) : (
            <ul className="space-y-5">
              {list.map((g) => {
                const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
                return (
                  <li key={g.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatBRL(Number(g.current_amount))} de {formatBRL(Number(g.target_amount))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{pct}%</span>
                        <Button size="icon" variant="ghost" onClick={() => remove(g.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

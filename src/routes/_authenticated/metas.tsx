import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data ?? []) as Goal[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const t = Number(target.replace(",", "."));
    const c = Number((current || "0").replace(",", "."));
    if (!name || !t) return toast.error("Informe nome e valor alvo");
    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      name,
      target_amount: t,
      current_amount: c,
    });
    if (error) return toast.error(error.message);
    toast.success("Meta criada");
    setName("");
    setTarget("");
    setCurrent("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removida");
      load();
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Metas</h1>
        <p className="text-muted-foreground">Acompanhe a evolução dos seus objetivos.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova meta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Poupança"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor alvo (R$)</Label>
              <Input
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Já alcançado (R$)</Label>
              <Input
                inputMode="decimal"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit">Adicionar meta</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suas metas</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((g) => {
                const pct = Math.min(
                  100,
                  Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100),
                );
                return (
                  <div
                    key={g.id}
                    className="rounded-xl border bg-card p-5 flex items-center gap-4 relative group"
                  >
                    <CircularProgress value={pct} size={96} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatBRL(Number(g.current_amount))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        de {formatBRL(Number(g.target_amount))}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                      onClick={() => remove(g.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CircularProgress({ value, size = 96 }: { value: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--muted)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="oklch(0.55 0.06 150)"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        className="fill-foreground"
        fontSize={size * 0.22}
        fontWeight={600}
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {value}%
      </text>
    </svg>
  );
}

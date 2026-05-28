import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { formatBRL } from "@/lib/finance-constants";
import { useAuth } from "@/hooks/use-auth";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { MonthSelector } from "./relatorios";
import { useSetPageHeader } from "@/hooks/use-page-header";
import { toast } from "sonner";
import {
  Pencil, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb,
  Wallet, Plus, PiggyBank, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: Orcamentos,
});

interface CategoryBudget {
  id?: string;
  category: string;
  planned_amount: number;
  group_kind: "necessidade" | "desejo" | "poupanca";
}
interface MonthlyBudget {
  id?: string;
  total_amount: number;
  tip_text: string | null;
}
interface Tx {
  id: string; category: string; amount: number; kind: string; competence_month: string;
}
interface Goal { id: string; name: string; target_amount: number; current_amount: number; }

const DEFAULT_GROUP: Record<string, "necessidade" | "desejo" | "poupanca"> = {
  Moradia: "necessidade", Alimentação: "necessidade", Mercado: "necessidade",
  Feira: "necessidade", Transporte: "necessidade", Uber: "necessidade",
  "VEM / Recarga": "necessidade", Saúde: "necessidade", "Plano de Saúde": "necessidade",
  Farmácia: "necessidade", Energia: "necessidade", Água: "necessidade",
  Internet: "necessidade", Gás: "necessidade", Faculdade: "necessidade",
  Educação: "necessidade", Lazer: "desejo", Restaurante: "desejo",
  Lanches: "desejo", Cinema: "desejo", Streaming: "desejo", Outros: "desejo",
  Presentes: "desejo", Viagem: "poupanca", Reserva: "poupanca",
};

function Orcamentos() {
  const { user } = useAuth();
  const { titular } = useTitular();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tx, setTx] = useState<Tx[]>([]);
  const [prevTx, setPrevTx] = useState<Tx[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget>({ total_amount: 0, tip_text: null });
  const [catBudgets, setCatBudgets] = useState<CategoryBudget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipDraft, setTipDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newCat, setNewCat] = useState({ category: "", planned_amount: "", group_kind: "necessidade" as const });

  const monthIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  const daysElapsed = isCurrent ? today : daysInMonth;

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [year, month, titular, user?.id]);

  async function load() {
    if (!user) return;
    const start = monthIso;
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    const startPrev = new Date(year, month - 3, 1).toISOString().slice(0, 10);

    let qTx = supabase.from("transactions")
      .select("id, category, amount, kind, competence_month")
      .gte("competence_month", start).lt("competence_month", end);
    qTx = applyTitular(qTx, titular);
    qTx.then(({ data }) => setTx((data ?? []) as Tx[]));

    let qPrev = supabase.from("transactions")
      .select("id, category, amount, kind, competence_month")
      .gte("competence_month", startPrev).lt("competence_month", start);
    qPrev = applyTitular(qPrev, titular);
    qPrev.then(({ data }) => setPrevTx((data ?? []) as Tx[]));

    supabase.from("monthly_budgets").select("*").eq("competence_month", monthIso).maybeSingle()
      .then(({ data }) => setBudget(data ?? { total_amount: 0, tip_text: null }));

    supabase.from("category_budgets").select("*").eq("competence_month", monthIso)
      .then(({ data }) => setCatBudgets((data ?? []) as CategoryBudget[]));

    supabase.from("goals").select("*").then(({ data }) => setGoals((data ?? []) as Goal[]));
  }

  const spentByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      m[t.category] = (m[t.category] ?? 0) + Number(t.amount);
    });
    return m;
  }, [tx]);

  const avgPrevByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    prevTx.filter((t) => t.kind !== "receita").forEach((t) => {
      m[t.category] = (m[t.category] ?? 0) + Number(t.amount);
    });
    const months = new Set(prevTx.map((t) => t.competence_month)).size || 1;
    Object.keys(m).forEach((k) => { m[k] = m[k] / months; });
    return m;
  }, [prevTx]);

  const totalUsed = useMemo(() =>
    Object.values(spentByCategory).reduce((a, b) => a + b, 0), [spentByCategory]);
  const totalPlanned = Number(budget.total_amount) || 0;
  const remaining = totalPlanned - totalUsed;
  const usedPct = totalPlanned > 0 ? Math.round((totalUsed / totalPlanned) * 100) : 0;
  const dailyAvg = daysElapsed > 0 ? totalUsed / daysElapsed : 0;
  const projected = isCurrent ? dailyAvg * daysInMonth : totalUsed;
  const projectedPct = totalPlanned > 0 ? Math.round((projected / totalPlanned) * 100) : 0;

  // Resumo por grupo
  const groupSum = useMemo(() => {
    const m: Record<string, number> = { necessidade: 0, desejo: 0, poupanca: 0 };
    Object.entries(spentByCategory).forEach(([cat, val]) => {
      const cb = catBudgets.find((c) => c.category === cat);
      const g = cb?.group_kind ?? DEFAULT_GROUP[cat] ?? "desejo";
      m[g] += val;
    });
    return m;
  }, [spentByCategory, catBudgets]);

  const groupTotal = Math.max(1, groupSum.necessidade + groupSum.desejo + groupSum.poupanca);

  const donutData = [
    { name: "Utilizado", value: Math.min(totalUsed, totalPlanned) },
    { name: "Restante", value: Math.max(0, remaining) },
  ];
  const groupData = [
    { name: "Necessidades", value: groupSum.necessidade, color: "oklch(0.55 0.13 150)" },
    { name: "Desejos", value: groupSum.desejo, color: "oklch(0.7 0.15 50)" },
    { name: "Poupança", value: groupSum.poupanca, color: "oklch(0.55 0.12 280)" },
  ];

  async function saveBudgetTotal(value: number) {
    if (!user) return;
    const { error } = await supabase.from("monthly_budgets").upsert({
      user_id: user.id, competence_month: monthIso, total_amount: value, tip_text: budget.tip_text,
    }, { onConflict: "user_id,competence_month" });
    if (error) return toast.error(error.message);
    toast.success("Orçamento atualizado");
    load();
  }

  async function saveTip() {
    if (!user) return;
    const { error } = await supabase.from("monthly_budgets").upsert({
      user_id: user.id, competence_month: monthIso,
      total_amount: budget.total_amount, tip_text: tipDraft,
    }, { onConflict: "user_id,competence_month" });
    if (error) return toast.error(error.message);
    setTipOpen(false);
    toast.success("Dica salva");
    load();
  }

  async function saveCatBudget(cat: CategoryBudget) {
    if (!user) return;
    const { error } = await supabase.from("category_budgets").upsert({
      user_id: user.id, competence_month: monthIso,
      category: cat.category, planned_amount: cat.planned_amount, group_kind: cat.group_kind,
    }, { onConflict: "user_id,competence_month,category" });
    if (error) return toast.error(error.message);
    load();
  }

  /** Renomeia a categoria do orçamento sem mexer nas transações (parcelas etc.). */
  async function renameCatBudget(oldCat: string, next: { category: string; planned_amount: number; group_kind: "necessidade" | "desejo" | "poupanca" }) {
    if (!user) return;
    const newName = next.category.trim();
    if (!newName) return toast.error("Informe um nome de categoria");
    if (newName === oldCat) {
      return saveCatBudget({ category: oldCat, planned_amount: next.planned_amount, group_kind: next.group_kind });
    }
    const exists = catBudgets.find((c) => c.category.toLowerCase() === newName.toLowerCase());
    if (exists) return toast.error("Já existe um orçamento com esse nome");
    const { error: insErr } = await supabase.from("category_budgets").upsert({
      user_id: user.id, competence_month: monthIso,
      category: newName, planned_amount: next.planned_amount, group_kind: next.group_kind,
    }, { onConflict: "user_id,competence_month,category" });
    if (insErr) return toast.error(insErr.message);
    const { error: delErr } = await supabase.from("category_budgets")
      .delete().eq("competence_month", monthIso).eq("category", oldCat);
    if (delErr) return toast.error(delErr.message);
    toast.success("Categoria renomeada (parcelamentos preservados)");
    load();
  }

  async function deleteCatBudget(cat: string) {
    if (!user) return;
    const ok = window.confirm(
      `Remover "${cat}" do orçamento de ${monthLabel}?\n\nIsto apaga apenas a linha do orçamento desta aba. Suas transações, parcelamentos, cartões e categorias globais permanecem intactos.`
    );
    if (!ok) return;
    const { error } = await supabase.from("category_budgets")
      .delete().eq("competence_month", monthIso).eq("category", cat).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria removida do orçamento");
    load();
  }

  async function addNewCat() {
    if (!newCat.category) return toast.error("Informe a categoria");
    await saveCatBudget({
      category: newCat.category,
      planned_amount: Number(newCat.planned_amount) || 0,
      group_kind: newCat.group_kind,
    });
    setNewCat({ category: "", planned_amount: "", group_kind: "necessidade" });
    setAddOpen(false);
  }

  function statusBadge(pct: number) {
    if (pct >= 100) return <Badge variant="destructive">Ultrapassado</Badge>;
    if (pct >= 80) return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Atenção</Badge>;
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Normal</Badge>;
  }

  function forecastBadge(avg: number, planned: number) {
    if (planned <= 0) return <Badge variant="outline">Sem orçamento</Badge>;
    const projected = avg;
    if (projected >= planned) return <Badge variant="destructive">Ultrapassará</Badge>;
    if (projected >= planned * 0.85) return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Provável ultrapassar</Badge>;
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Dentro do limite</Badge>;
  }

  // tabela: união de categorias do orçamento + categorias usadas
  const tableRows = useMemo(() => {
    const cats = new Set<string>();
    catBudgets.forEach((c) => cats.add(c.category));
    Object.keys(spentByCategory).forEach((c) => cats.add(c));
    return Array.from(cats).map((category) => {
      const cb = catBudgets.find((c) => c.category === category);
      const planned = Number(cb?.planned_amount ?? 0);
      const spent = spentByCategory[category] ?? 0;
      const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0;
      const rest = planned - spent;
      return { category, planned, spent, pct, rest, group: cb?.group_kind ?? DEFAULT_GROUP[category] ?? "desejo" };
    }).sort((a, b) => b.spent - a.spent);
  }, [catBudgets, spentByCategory]);

  // Forecast (top 5 categorias com média alta)
  const forecastRows = useMemo(() => {
    const all = Object.entries(avgPrevByCategory)
      .map(([category, avg]) => {
        const cb = catBudgets.find((c) => c.category === category);
        return { category, avg, planned: Number(cb?.planned_amount ?? 0) };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
    return all;
  }, [avgPrevByCategory, catBudgets]);

  // Dicas
  const tips = useMemo(() => {
    const list: { type: "ok" | "warn" | "err"; title: string; text: string }[] = [];
    const over = tableRows.filter((r) => r.pct >= 100);
    const attn = tableRows.filter((r) => r.pct >= 80 && r.pct < 100);
    const okCount = tableRows.filter((r) => r.pct < 80 && r.planned > 0).length;
    if (okCount > 0) list.push({ type: "ok", title: "Você está indo bem!", text: `${okCount} categorias dentro do esperado.` });
    attn.slice(0, 1).forEach((r) => list.push({
      type: "warn", title: `Atenção com ${r.category}`,
      text: "Você está próximo do limite definido.",
    }));
    over.slice(0, 1).forEach((r) => list.push({
      type: "err", title: `${r.category} ultrapassou`,
      text: "Revise seus gastos para o restante do mês.",
    }));
    if (list.length === 0) list.push({ type: "ok", title: "Tudo certo", text: "Defina seu orçamento por categoria para começar." });
    return list;
  }, [tableRows]);

  useSetPageHeader(
    () => ({
      title: (
        <span className="flex items-center gap-2">
          <span className="inline-grid place-items-center size-7 rounded-lg premium-chip">
            <PiggyBank className="size-4 text-primary" />
          </span>
          <span className="text-gradient-primary">Gestão Orçamentária</span>
        </span>
      ),
      subtitle: <span className="capitalize">{monthLabel}</span>,
      actions: (
        <>
          <Button size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="size-4" /> Editar planejamento
          </Button>
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </>
      ),
    }),
    [monthLabel, year, month]
  );

  return (
    <div className="space-y-6">


      {/* Resumo top */}
      <Card>
        <CardContent className="py-5">
          <div className="grid gap-6 md:grid-cols-5 items-center">
            <Kpi label="Orçamento mensal" value={formatBRL(totalPlanned)} sub="Valor definido para o mês" />
            <Kpi label="Total utilizado" value={formatBRL(totalUsed)} sub={`${usedPct}% do orçamento`} accent="warn" />
            <Kpi label="Restante" value={formatBRL(remaining)} sub={`${Math.max(0, 100 - usedPct)}% disponível`} accent={remaining < 0 ? "err" : "ok"} />
            <Kpi label="Previsto até o fim do mês" value={formatBRL(projected)} sub={`${projectedPct}% do orçamento`} accent={projectedPct > 100 ? "err" : "ok"} />
            <div className="flex items-center gap-3 justify-end">
              <div className="size-28 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={36} outerRadius={52} startAngle={90} endAngle={-270}>
                      <Cell fill="oklch(0.7 0.15 50)" />
                      <Cell fill="oklch(0.7 0.12 150)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-lg font-semibold">
                  {usedPct}%
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber-500" /> Utilizado <span className="font-medium ml-1">{formatBRL(totalUsed)}</span></div>
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-600" /> Restante <span className="font-medium ml-1">{formatBRL(Math.max(0, remaining))}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabela */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Orçamento por categorias</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" /> Adicionar categoria
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead className="w-[24%]">Utilizado</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma categoria. Clique em "Adicionar categoria".
                  </TableCell></TableRow>
                )}
                {tableRows.map((r) => (
                  <EditableBudgetRow
                    key={r.category}
                    row={r}
                    onSave={(next) => renameCatBudget(r.category, next)}
                    onDelete={() => deleteCatBudget(r.category)}
                    statusBadge={statusBadge}
                  />
                ))}
                {tableRows.length > 0 && (
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell>Total</TableCell>
                    <TableCell>{formatBRL(totalPlanned)}</TableCell>
                    <TableCell>{formatBRL(totalUsed)}</TableCell>
                    <TableCell />
                    <TableCell>{usedPct}%</TableCell>
                    <TableCell>{formatBRL(remaining)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-4" /> Previsão de gastos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {forecastRows.length === 0 && <div className="text-sm text-muted-foreground">Sem histórico suficiente.</div>}
              {forecastRows.map((f) => (
                <div key={f.category} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.category}</div>
                    <div className="text-xs text-muted-foreground">Média: {formatBRL(f.avg)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Previsão: {formatBRL(f.avg)}</div>
                    <div className="mt-1">{forecastBadge(f.avg, f.planned)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo orçamentário</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição do orçamento</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="size-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupData} dataKey="value" innerRadius={28} outerRadius={48}>
                        {groupData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1 text-sm">
                  {groupData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: d.color }} /> {d.name}</span>
                      <span className="font-medium">{Math.round((d.value / groupTotal) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Planejamento do mês</CardTitle>
              <p className="text-xs text-muted-foreground">Defina seus limites e mantenha o controle.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setTipDraft(budget.tip_text ?? ""); setTipOpen(true); }} className="gap-2">
              <Pencil className="size-4" /> Editar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/40 p-4 flex gap-3 items-start">
              <Lightbulb className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Dica</div>
                <div className="text-sm text-muted-foreground">
                  {budget.tip_text ?? "Tente manter suas despesas variáveis abaixo de 30% do seu orçamento total."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="size-4" /> Metas financeiras</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {goals.length === 0 && <div className="text-sm text-muted-foreground">Crie metas na seção Metas.</div>}
            {goals.slice(0, 3).map((g) => {
              const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{g.name}</div>
                    <div>{formatBRL(Number(g.current_amount))}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Meta: {formatBRL(Number(g.target_amount))}</div>
                  <Progress value={pct} />
                  <div className="text-xs text-right text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dicas para o mês</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tips.map((t, i) => (
              <div key={i} className="flex gap-3 items-start">
                {t.type === "ok" && <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />}
                {t.type === "warn" && <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />}
                {t.type === "err" && <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <div className={`font-medium text-sm ${t.type === "err" ? "text-destructive" : t.type === "warn" ? "text-amber-600" : "text-emerald-700"}`}>{t.title}</div>
                  <div className="text-sm text-muted-foreground">{t.text}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dialog editar orçamento mensal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Orçamento mensal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="text-sm">Valor total (R$)</label>
            <Input
              type="number"
              defaultValue={budget.total_amount}
              id="bd-total"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => {
              const v = Number((document.getElementById("bd-total") as HTMLInputElement)?.value || 0);
              saveBudgetTotal(v);
              setEditOpen(false);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog dica */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dica do mês</DialogTitle></DialogHeader>
          <Input value={tipDraft} onChange={(e) => setTipDraft(e.target.value)} placeholder="Sua dica..." />
          <DialogFooter><Button onClick={saveTip}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog adicionar categoria */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar categoria ao orçamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Categoria" value={newCat.category} onChange={(e) => setNewCat((p) => ({ ...p, category: e.target.value }))} />
            <Input placeholder="Valor planejado" type="number" value={newCat.planned_amount} onChange={(e) => setNewCat((p) => ({ ...p, planned_amount: e.target.value }))} />
            <Select value={newCat.group_kind} onValueChange={(v) => setNewCat((p) => ({ ...p, group_kind: v as never }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="necessidade">Necessidade</SelectItem>
                <SelectItem value="desejo">Desejo</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={addNewCat}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "ok" | "warn" | "err" }) {
  const color =
    accent === "err" ? "text-destructive" :
    accent === "warn" ? "text-amber-600" :
    accent === "ok" ? "text-emerald-700 dark:text-emerald-400" : "";
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

type GroupKind = "necessidade" | "desejo" | "poupanca";
type BudgetRow = {
  category: string; planned: number; spent: number; pct: number; rest: number; group: GroupKind;
};

function EditableBudgetRow({
  row, onSave, onDelete, statusBadge,
}: {
  row: BudgetRow;
  onSave: (next: { category: string; planned_amount: number; group_kind: GroupKind }) => void;
  onDelete: () => void;
  statusBadge: (pct: number) => React.ReactElement;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.category);
  const [planned, setPlanned] = useState(String(row.planned));
  const [group, setGroup] = useState<GroupKind>(row.group);

  useEffect(() => {
    if (!editing) { setName(row.category); setPlanned(String(row.planned)); setGroup(row.group); }
  }, [row.category, row.planned, row.group, editing]);

  function commit() {
    onSave({ category: name.trim() || row.category, planned_amount: Number(planned) || 0, group_kind: group });
    setEditing(false);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {editing ? (
          <div className="flex flex-col gap-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-40" />
            <Select value={group} onValueChange={(v) => setGroup(v as GroupKind)}>
              <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="necessidade">Necessidade</SelectItem>
                <SelectItem value="desejo">Desejo</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-col">
            <span>{row.category}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.group}</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={editing ? planned : undefined}
          defaultValue={editing ? undefined : row.planned}
          onChange={editing ? (e) => setPlanned(e.target.value) : undefined}
          onBlur={editing ? undefined : (e) => {
            const v = Number(e.target.value);
            if (v !== row.planned) onSave({ category: row.category, planned_amount: v, group_kind: row.group });
          }}
          className="h-8 w-28"
        />
      </TableCell>
      <TableCell>{formatBRL(row.spent)}</TableCell>
      <TableCell>
        <Progress value={Math.min(100, row.pct)} className={row.pct >= 100 ? "[&>div]:bg-destructive" : row.pct >= 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-600"} />
      </TableCell>
      <TableCell>{row.pct}%</TableCell>
      <TableCell className={row.rest < 0 ? "text-destructive font-medium" : ""}>{formatBRL(row.rest)}</TableCell>
      <TableCell>{statusBadge(row.pct)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          {editing ? (
            <>
              <Button size="sm" variant="default" onClick={commit}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Editar categoria">
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} title="Remover do orçamento (transações são mantidas)">×</Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { formatBRL } from "@/lib/finance-constants";
import { TrendingUp, Wallet, TrendingDown, CreditCard, CheckCircle2, Lock, CalendarClock, Circle, Coins } from "lucide-react";
import { MonthSelector } from "./relatorios";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { useClosedMonths } from "@/hooks/use-closed-months";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Tx {
  id: string; occurred_on: string; competence_month: string;
  kind: string; category: string; amount: number;
  description: string | null; bank: string | null;
  payment_method: string | null; titular: string | null;
  installment_no: number | null; installments_total: number | null;
  card_id: string | null;
  status: string;
}
interface CardRow { id: string; name: string; bank: string; titular: string | null; closing_day: number; due_day: number; }
interface Goal { id: string; name: string; target_amount: number; current_amount: number; }

const PIE_COLORS = [
  "oklch(0.55 0.06 150)", "oklch(0.65 0.1 130)", "oklch(0.5 0.1 280)",
  "oklch(0.72 0.1 90)", "oklch(0.6 0.12 200)", "oklch(0.68 0.13 30)",
  "oklch(0.45 0.08 160)", "oklch(0.58 0.11 320)", "oklch(0.7 0.08 60)",
  "oklch(0.5 0.05 250)",
];

function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tx, setTx] = useState<Tx[]>([]);
  const [nextTx, setNextTx] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [detailKind, setDetailKind] = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const { titular } = useTitular();
  const { closedMonths, isClosed, close, reopen, loading: closedLoading } = useClosedMonths();

  // Default: se mês atual está fechado, abre no próximo aberto.
  useEffect(() => {
    if (closedLoading || defaultApplied) return;
    const currIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    let probe = currIso;
    for (let i = 0; i < 12 && closedMonths.includes(probe); i++) {
      const [y, m] = probe.split("-").map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      probe = `${ny}-${String(nm).padStart(2, "0")}-01`;
    }
    if (probe !== currIso) {
      const [py, pm] = probe.split("-").map(Number);
      setYear(py); setMonth(pm - 1);
    }
    setDefaultApplied(true);
  }, [closedLoading, closedMonths, defaultApplied]);

  const currentMonthIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonthIso = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const currentClosed = isClosed(currentMonthIso);
  const monthLabelShort = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long" });
  const nextMonthLabel = nextMonthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    const endNext = new Date(year, month + 2, 1).toISOString().slice(0, 10);
    let q = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", start).lt("competence_month", end)
      .order("occurred_on", { ascending: false });
    q = applyTitular(q, titular);
    q.then(({ data }) => setTx((data ?? []) as Tx[]));

    let qn = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", end).lt("competence_month", endNext);
    qn = applyTitular(qn, titular);
    qn.then(({ data }) => setNextTx((data ?? []) as Tx[]));

    supabase.from("goals").select("*").then(({ data }) => setGoals((data ?? []) as Goal[]));
    supabase.from("cards").select("id, name, bank, titular, closing_day, due_day").then(({ data }) => setCards((data ?? []) as CardRow[]));
  }, [year, month, titular]);

  const visibleCards = useMemo(
    () => cards.filter((c) => titular === "all" || !c.titular || c.titular === titular),
    [cards, titular],
  );
  const cardTotals = useMemo(() => {
    return visibleCards.map((c) => {
      const items = tx.filter((t) => t.payment_method === "Crédito" && t.card_id === c.id);
      const total = items.reduce((s, t) => s + Number(t.amount), 0);
      return { card: c, total, count: items.length };
    });
  }, [visibleCards, tx]);

  const sum = (k: string) => tx.filter((t) => t.kind === k).reduce((s, t) => s + Number(t.amount), 0);
  const sumPaid = (k: string) =>
    tx.filter((t) => t.kind === k && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0);
  const sumPending = (k: string) =>
    tx.filter((t) => t.kind === k && t.status !== "pago").reduce((s, t) => s + Number(t.amount), 0);
  const receitas = sum("receita");
  const fixos = sum("fixo");
  const variaveis = sum("variavel");
  const parcelas = sum("parcelamento");

  // Saldo = Receitas - tudo que já foi pago (todas as categorias exceto receita)
  const totalPago = tx
    .filter((t) => t.kind !== "receita" && t.status === "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalPendente = tx
    .filter((t) => t.kind !== "receita" && t.status !== "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const saldoConta = receitas - totalPago;

  async function refresh() {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    let q = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", start).lt("competence_month", end)
      .order("occurred_on", { ascending: false });
    q = applyTitular(q, titular);
    const { data } = await q;
    setTx((data ?? []) as Tx[]);
  }

  async function toggleStatus(t: Tx) {
    const next = t.status === "pago" ? "pendente" : "pago";
    setTx((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x));
    const { error } = await supabase.from("transactions").update({ status: next }).eq("id", t.id);
    if (error) { toast.error(error.message); refresh(); return; }
    toast.success(next === "pago" ? "Marcado como pago" : "Marcado como pendente");
  }

  const receitaTrend = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const buckets = Array.from({ length: Math.ceil(days / 5) }, (_, i) => ({
      label: `S${i + 1}`, valor: 0,
    }));
    tx.filter((t) => t.kind === "receita").forEach((t) => {
      const d = new Date(t.occurred_on).getDate();
      const idx = Math.floor((d - 1) / 5);
      if (buckets[idx]) buckets[idx].valor += Number(t.amount);
    });
    return buckets;
  }, [tx, year, month]);

  const fixosByCat = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind === "fixo").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [tx]);

  const variaveisByCat = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind === "variavel").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [tx]);

  const parcList = useMemo(() => tx.filter((t) => t.kind === "parcelamento").slice(0, 4), [tx]);

  const weekly = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const buckets = Array.from({ length: Math.ceil(days / 4) }, (_, i) => ({
      label: `Sem ${i * 4 + 1}`,
      Saldo: 0, Fixos: 0, Variáveis: 0, Parcelamentos: 0,
    }));
    let acc = 0;
    tx.slice().sort((a, b) => a.occurred_on.localeCompare(b.occurred_on)).forEach((t) => {
      const d = new Date(t.occurred_on).getDate();
      const idx = Math.floor((d - 1) / 4);
      const v = Number(t.amount);
      if (!buckets[idx]) return;
      if (t.kind === "receita") acc += v;
      else acc -= v;
      buckets[idx].Saldo = acc;
      if (t.kind === "fixo") buckets[idx].Fixos += v;
      if (t.kind === "variavel") buckets[idx].Variáveis += v;
      if (t.kind === "parcelamento") buckets[idx].Parcelamentos += v;
    });
    return buckets;
  }, [tx, year, month]);

  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [tx]);

  const recent = tx.slice(0, 6);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const useBarsForCategories = topCategories.length > 6;
  const nextOutflow = useMemo(
    () => nextTx.filter((t) => t.kind !== "receita").reduce((s, t) => s + Number(t.amount), 0),
    [nextTx],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground capitalize flex items-center gap-2">
            {monthLabel}
            {currentClosed && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="size-3" /> Fatura paga
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={currentClosed ? "outline" : "default"}
            size="sm"
            onClick={() => currentClosed ? reopen(currentMonthIso) : close(currentMonthIso)}
            className="gap-2"
          >
            {currentClosed ? (
              <><Lock className="size-4" /> Reabrir fatura de <span className="capitalize">{monthLabelShort}</span></>
            ) : (
              <><CheckCircle2 className="size-4" /> Marcar fatura de <span className="capitalize">{monthLabelShort}</span> como paga</>
            )}
          </Button>
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>
      </header>

      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-background">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <Coins className="size-4 text-emerald-600" />
              Saldo em conta · <span className="capitalize text-foreground font-medium">{monthLabel}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receitas do mês menos tudo que já foi efetivamente pago (gastos fixos liquidados, fatura paga, PIX/Débito).
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            Fórmula: Receitas − Pagos
          </Badge>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold tracking-tight ${saldoConta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
            {formatBRL(saldoConta)}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Receitas: <span className="font-medium text-success">{formatBRL(receitas)}</span></span>
            <span>Pagos: <span className="font-medium text-emerald-700 dark:text-emerald-400">−{formatBRL(totalPago)}</span></span>
            <span>Pendentes (não impactam saldo): <span className="font-medium text-amber-600">{formatBRL(totalPendente)}</span></span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card onClick={() => setDetailKind("receita")} className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md">

          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Receitas</CardTitle>
            <TrendingUp className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success">{formatBRL(receitas)}</div>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={receitaTrend}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.12 150)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.12 150)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="valor" stroke="oklch(0.62 0.12 150)" fill="url(#gReceita)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setDetailKind("fixo")} className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md">

          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Gastos Fixos</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(fixos)}</div>
            <PaidPendingRow paid={sumPaid("fixo")} pending={sumPending("fixo")} />
            <div className="h-12 mt-2">
              {fixosByCat.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fixosByCat} dataKey="value" innerRadius={18} outerRadius={32}>
                      {fixosByCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setDetailKind("variavel")} className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md">

          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Gastos Variáveis</CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(variaveis)}</div>
            <PaidPendingRow paid={sumPaid("variavel")} pending={sumPending("variavel")} />
            <div className="h-12 mt-2">
              {variaveisByCat.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={variaveisByCat}>
                    <Bar dataKey="value" fill="oklch(0.55 0.06 150)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => setDetailKind("parcelamento")} className="cursor-pointer transition-all hover:border-primary/60 hover:shadow-md">

          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Parcelamentos</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(parcelas)}</div>
            <PaidPendingRow paid={sumPaid("parcelamento")} pending={sumPending("parcelamento")} />
            <div className="mt-2 space-y-1 text-xs">
              {parcList.length === 0 ? (
                <div className="text-muted-foreground">Sem parcelamentos</div>
              ) : parcList.map((p) => (
                <div key={p.id} className="flex justify-between border-b border-border/40 pb-0.5">
                  <span className="truncate text-muted-foreground">{p.category}</span>
                  <span className="font-medium">{formatBRL(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              Previsão de Saída · <span className="capitalize text-foreground font-medium">{nextMonthLabel}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Soma de tudo que já está provisionado para o próximo mês (cartão, variáveis, fixos e parcelas).
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            {nextTx.length} {nextTx.length === 1 ? "lançamento" : "lançamentos"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">{formatBRL(nextOutflow)}</div>
        </CardContent>
      </Card>

      {cardTotals.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Faturas por cartão · competência selecionada</h2>
            <span className="text-xs text-muted-foreground">
              Total: {formatBRL(cardTotals.reduce((s, c) => s + c.total, 0))}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cardTotals.map(({ card, total, count }) => {
              const brand = BANK_BRAND[card.bank.toUpperCase()] ?? BANK_BRAND.DEFAULT;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setDetailCardId(card.id)}
                  className="group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-lg hover:scale-[1.02]"
                  style={{ background: brand.gradient, borderColor: brand.border }}
                >
                  <div className="flex items-start justify-between text-white/95">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="rounded-md bg-white/15 p-1.5 backdrop-blur-sm">
                        <CreditCard className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{card.name}</div>
                        <div className="text-[11px] uppercase tracking-wider opacity-80">{card.bank}</div>
                      </div>
                    </div>
                    {card.titular && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                        {card.titular}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-white">
                    <div className="text-2xl font-bold tracking-tight">{formatBRL(total)}</div>
                    <div className="text-[11px] opacity-80">
                      {count} {count === 1 ? "lançamento" : "lançamentos"} · venc. dia {card.due_day}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Análise Semanal de Saldos</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Saldo" stroke="oklch(0.55 0.06 150)" strokeWidth={2} />
                <Line type="monotone" dataKey="Fixos" stroke="oklch(0.6 0.12 200)" strokeWidth={2} />
                <Line type="monotone" dataKey="Variáveis" stroke="oklch(0.7 0.08 130)" strokeWidth={2} />
                <Line type="monotone" dataKey="Parcelamentos" stroke="oklch(0.5 0.1 280)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução de Metas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
            ) : goals.slice(0, 4).map((g) => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <CircularProgress value={pct} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBRL(Number(g.current_amount))} / {formatBRL(Number(g.target_amount))}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Lançamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.occurred_on).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell className={`text-right font-medium ${t.kind === "receita" ? "text-success" : ""}`}>
                        {formatBRL(Number(t.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Maiores Gastos por Categoria</CardTitle></CardHeader>
          <CardContent className="h-[320px]">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : useBarsForCategories ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => formatBRL(v)} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={90} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="value" fill="oklch(0.55 0.06 150)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCategories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {topCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <DetailDialog
        kind={detailKind}
        onClose={() => setDetailKind(null)}
        transactions={tx}
        monthLabel={monthLabel}
      />

      <CardDetailDialog
        cardId={detailCardId}
        onClose={() => setDetailCardId(null)}
        transactions={tx}
        cards={cards}
        monthLabel={monthLabel}
      />
    </div>
  );
}

const BANK_BRAND: Record<string, { gradient: string; border: string }> = {
  NUBANK: { gradient: "linear-gradient(135deg, #8a05be 0%, #5b0091 100%)", border: "#8a05be" },
  INTER: { gradient: "linear-gradient(135deg, #ff7a00 0%, #cc5800 100%)", border: "#ff7a00" },
  ITAU: { gradient: "linear-gradient(135deg, #ec7000 0%, #003399 100%)", border: "#ec7000" },
  BRADESCO: { gradient: "linear-gradient(135deg, #cc092f 0%, #8a0620 100%)", border: "#cc092f" },
  SANTANDER: { gradient: "linear-gradient(135deg, #ec0000 0%, #a40000 100%)", border: "#ec0000" },
  CAIXA: { gradient: "linear-gradient(135deg, #0070af 0%, #f39200 100%)", border: "#0070af" },
  "BANCO DO BRASIL": { gradient: "linear-gradient(135deg, #fae100 0%, #002d72 100%)", border: "#002d72" },
  BB: { gradient: "linear-gradient(135deg, #fae100 0%, #002d72 100%)", border: "#002d72" },
  C6: { gradient: "linear-gradient(135deg, #2c2c2c 0%, #000000 100%)", border: "#2c2c2c" },
  XP: { gradient: "linear-gradient(135deg, #1e1e1e 0%, #f1c700 100%)", border: "#f1c700" },
  PICPAY: { gradient: "linear-gradient(135deg, #21c25e 0%, #0e8a3e 100%)", border: "#21c25e" },
  DEFAULT: { gradient: "linear-gradient(135deg, oklch(0.45 0.08 250) 0%, oklch(0.3 0.06 250) 100%)", border: "oklch(0.45 0.08 250)" },
};

function CardDetailDialog({
  cardId, onClose, transactions, cards, monthLabel,
}: {
  cardId: string | null;
  onClose: () => void;
  transactions: Tx[];
  cards: CardRow[];
  monthLabel: string;
}) {
  const card = cardId ? cards.find((c) => c.id === cardId) ?? null : null;
  const items = useMemo(
    () => cardId ? transactions.filter((t) => t.payment_method === "Crédito" && t.card_id === cardId) : [],
    [transactions, cardId],
  );
  const total = items.reduce((s, t) => s + Number(t.amount), 0);
  const brand = card ? (BANK_BRAND[card.bank.toUpperCase()] ?? BANK_BRAND.DEFAULT) : null;

  return (
    <Dialog open={!!cardId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        {card && brand && (
          <>
            <DialogHeader>
              <DialogTitle>Fatura {card.name} · <span className="capitalize">{monthLabel}</span></DialogTitle>
              <DialogDescription>
                {card.bank} · fechamento dia {card.closing_day} · vencimento dia {card.due_day}
                {card.titular ? ` · ${card.titular}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div
              className="rounded-lg p-4 text-white"
              style={{ background: brand.gradient }}
            >
              <div className="text-xs uppercase tracking-wider opacity-80">Total da fatura</div>
              <div className="text-3xl font-bold tracking-tight">{formatBRL(total)}</div>
              <div className="text-xs opacity-80">{items.length} {items.length === 1 ? "lançamento" : "lançamentos"}</div>
            </div>
            <ScrollArea className="h-[360px] rounded-md border">
              {items.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhum lançamento neste cartão para o período.</p>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">{new Date(t.occurred_on).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          {t.category}
                          {t.installments_total ? (
                            <span className="ml-1 text-xs text-muted-foreground">({t.installment_no}/{t.installments_total})</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                        <TableCell className="text-xs">{t.titular ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">{formatBRL(Number(t.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const KIND_META: Record<string, { title: string; description: string; accent: string }> = {
  receita: {
    title: "Receitas",
    description: "Todas as entradas de dinheiro do período. Inclui salários, freelas, rendimentos e outros valores recebidos.",
    accent: "text-success",
  },
  fixo: {
    title: "Gastos Fixos",
    description: "Despesas recorrentes que se repetem todo mês com valor previsível (aluguel, internet, assinaturas, contas de consumo).",
    accent: "text-foreground",
  },
  variavel: {
    title: "Gastos Variáveis",
    description: "Despesas pontuais que variam de mês a mês (mercado, transporte, lazer, refeições fora).",
    accent: "text-foreground",
  },
  parcelamento: {
    title: "Parcelamentos",
    description: "Compras parceladas em andamento. Cada parcela aparece no mês de competência (fatura) em que será cobrada.",
    accent: "text-foreground",
  },
};

function DetailDialog({
  kind, onClose, transactions, monthLabel,
}: {
  kind: string | null;
  onClose: () => void;
  transactions: Tx[];
  monthLabel: string;
}) {
  const meta = kind ? KIND_META[kind] : null;
  const filtered = useMemo(
    () => kind ? transactions.filter((t) => t.kind === kind) : [],
    [transactions, kind],
  );
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => { map[t.category] = (map[t.category] ?? 0) + Number(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        {meta && (
          <>
            <DialogHeader>
              <DialogTitle className={meta.accent}>{meta.title} · <span className="capitalize">{monthLabel}</span></DialogTitle>
              <DialogDescription>{meta.description}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className={`text-lg font-semibold ${meta.accent}`}>{formatBRL(total)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Quantidade</div>
                <div className="text-lg font-semibold">{filtered.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Média</div>
                <div className="text-lg font-semibold">{formatBRL(filtered.length ? total / filtered.length : 0)}</div>
              </div>
            </div>

            {byCategory.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Resumo por categoria</div>
                <div className="flex flex-wrap gap-1.5">
                  {byCategory.map(([cat, val]) => (
                    <Badge key={cat} variant="secondary" className="font-normal">
                      {cat} · {formatBRL(val)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="h-[360px] rounded-md border">
              {filtered.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhum lançamento neste período.</p>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">{new Date(t.occurred_on).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          {t.category}
                          {t.installments_total ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({t.installment_no}/{t.installments_total})
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {t.payment_method ?? "—"}{t.bank ? ` · ${t.bank}` : ""}
                        </TableCell>
                        <TableCell className="text-xs">{t.titular ?? "—"}</TableCell>
                        <TableCell className={`text-right font-medium whitespace-nowrap ${meta.accent}`}>
                          {formatBRL(Number(t.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


function CircularProgress({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="oklch(0.55 0.06 150)" strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
      <text
        x="50%" y="50%" dy="0.35em" textAnchor="middle"
        className="rotate-90 origin-center fill-foreground"
        fontSize={size * 0.28} fontWeight={600} transform={`rotate(90 ${size / 2} ${size / 2})`}
      >{value}%</text>
    </svg>
  );
}

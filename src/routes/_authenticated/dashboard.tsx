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
import { formatBRL, formatDateBR, parseLocalDate } from "@/lib/finance-constants";
import { TrendingUp, Wallet, TrendingDown, CreditCard, CheckCircle2, Lock, CalendarClock, Circle, Coins, ChevronRight, Bell, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { I3D, iconForCategory } from "@/lib/category-icons";
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
interface CardRow { id: string; name: string; bank: string; titular: string | null; closing_day: number; due_day: number; credit_limit: number; }
interface Account { id: string; name: string; bank: string | null; type: string; balance: number; titular: string | null; }
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
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    supabase.from("cards").select("id, name, bank, titular, closing_day, due_day, credit_limit").then(({ data }) => setCards((data ?? []) as CardRow[]));
    supabase.from("accounts").select("id, name, bank, type, balance, titular").then(({ data }) => setAccounts((data ?? []) as Account[]));
  }, [year, month, titular]);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => titular === "all" || !a.titular || a.titular === titular),
    [accounts, titular],
  );
  const totalContas = useMemo(() => visibleAccounts.reduce((s, a) => s + Number(a.balance), 0), [visibleAccounts]);

  const visibleCards = useMemo(
    () => cards.filter((c) => titular === "all" || !c.titular || c.titular === titular),
    [cards, titular],
  );
  const [cardOpenTotals, setCardOpenTotals] = useState<Record<string, number>>({});
  useEffect(() => {
    let q = supabase.from("transactions")
      .select("card_id, amount, titular, payment_method, status")
      .eq("payment_method", "Crédito")
      .neq("status", "pago");
    q = applyTitular(q, titular);
    q.then(({ data }) => {
      const map: Record<string, number> = {};
      (data ?? []).forEach((t: { card_id: string | null; amount: number | string }) => {
        if (!t.card_id) return;
        map[t.card_id] = (map[t.card_id] ?? 0) + Number(t.amount);
      });
      setCardOpenTotals(map);
    });
  }, [titular, tx]);

  const cardTotals = useMemo(() => {
    return visibleCards.map((c) => {
      const items = tx.filter((t) => t.payment_method === "Crédito" && t.card_id === c.id);
      const total = items.reduce((s, t) => s + Number(t.amount), 0);
      const paidCount = items.filter((t) => t.status === "pago").length;
      const allPaid = items.length > 0 && paidCount === items.length;
      const openTotal = cardOpenTotals[c.id] ?? 0;
      return { card: c, total, openTotal, count: items.length, paidCount, allPaid, items };
    });
  }, [visibleCards, tx, cardOpenTotals]);

  async function toggleCardStatus(cardId: string, markAs: "pago" | "pendente") {
    const target = cardTotals.find((c) => c.card.id === cardId);
    if (!target || target.items.length === 0) return;
    const ids = target.items.map((t) => t.id);
    setTx((prev) => prev.map((x) => ids.includes(x.id) ? { ...x, status: markAs } : x));
    const { error } = await supabase
      .from("transactions")
      .update({ status: markAs })
      .in("id", ids);
    if (error) { toast.error(error.message); refresh(); return; }
    toast.success(markAs === "pago" ? "Fatura marcada como paga" : "Fatura marcada como pendente");
  }

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
      const d = parseLocalDate(t.occurred_on).getDate();
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
      const d = parseLocalDate(t.occurred_on).getDate();
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

  const [hideBalance, setHideBalance] = useState(false);
  const variationPct = 12; // placeholder visual indicator
  const resultadoPrevisto = receitas - (fixos + variaveis + parcelas);
  const isDeficit = resultadoPrevisto < 0;
  const flowBuckets = [
    { key: "fixo", label: "Despesas Fixas", value: fixos, color: "oklch(0.62 0.16 25)" },
    { key: "variavel", label: "Despesas Variáveis", value: variaveis, color: "oklch(0.7 0.14 50)" },
    { key: "parcelamento", label: "Parcelamentos", value: parcelas, color: "oklch(0.58 0.12 280)" },
    { key: "outros", label: "Outros", value: Math.max(0, totalPago + totalPendente - fixos - variaveis - parcelas), color: "oklch(0.55 0.05 220)" },
  ];
  const totalDespesas = fixos + variaveis + parcelas + flowBuckets[3].value;
  const fluxoMax = Math.max(1, ...flowBuckets.map((b) => b.value));

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground capitalize text-sm mt-0.5">
            {monthLabel}
            {currentClosed && (
              <Badge variant="secondary" className="ml-2 gap-1 align-middle">
                <Lock className="size-3" /> Fatura paga
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={currentClosed ? "outline" : "default"}
            onClick={() => currentClosed ? reopen(currentMonthIso) : close(currentMonthIso)}
            className="gap-2 rounded-full"
          >
            {currentClosed ? <Lock className="size-4" /> : <CheckCircle2 className="size-4" />}
            {currentClosed ? "Reabrir" : "Marcar leitura de"} <span className="capitalize">{monthLabelShort}</span> {currentClosed ? "" : "como paga"}
          </Button>
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>
      </header>

      {/* BIG SALDO HERO */}
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-50/60 via-background to-background dark:from-emerald-950/20">
        <CardContent className="py-6">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr_1fr_auto] items-center">
            {/* Saldo */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="size-4 text-emerald-600" /> Saldo atual
                <button onClick={() => setHideBalance((v) => !v)} className="text-muted-foreground/70 hover:text-foreground">
                  {hideBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <div className={`mt-1 text-4xl font-bold tracking-tight ${saldoConta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                {hideBalance ? "R$ ••••" : formatBRL(saldoConta)}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${variationPct >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                  <TrendingUp className="size-3" /> {variationPct}%
                </span>
                em relação a {new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              </div>
            </div>

            {/* Visão geral do mês */}
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Visão Geral do Mês <span className="capitalize">({monthLabelShort})</span></div>
              <div className="mt-1 text-sm">
                Receitas <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatBRL(receitas)}</span> · Despesas <span className="font-semibold text-rose-600">{formatBRL(totalDespesas)}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Resultado previsto</div>
              <div className={`text-2xl font-bold tracking-tight ${isDeficit ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                {formatBRL(resultadoPrevisto)}
              </div>
            </div>

            {/* Déficit Previsto / alerta */}
            <div className={`rounded-xl p-4 ${isDeficit ? "bg-rose-100/70 dark:bg-rose-950/30 border border-rose-300/50" : "bg-emerald-100/70 dark:bg-emerald-950/30 border border-emerald-300/40"}`}>
              <div className="flex items-start gap-3">
                <img src={isDeficit ? I3D.warning : I3D.cartGreen} alt="" className="size-10" loading="lazy" />
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${isDeficit ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {isDeficit ? "Déficit Previsto" : "Superávit Previsto"}
                  </div>
                  <div className={`text-2xl font-bold ${isDeficit ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {formatBRL(Math.abs(resultadoPrevisto))}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {isDeficit ? "Suas despesas previstas superam suas receitas." : "Suas receitas superam as despesas."}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Ver detalhes */}
            <div className="flex md:justify-end">
              <Button variant="outline" size="sm" className="gap-1 rounded-full" onClick={() => setDetailKind("variavel")}>
                Ver detalhes completos <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <img src={I3D.moneyBag} alt="" aria-hidden className="hidden md:block absolute right-1/3 top-1/2 -translate-y-1/2 size-24 opacity-40 pointer-events-none" loading="lazy" />
        </CardContent>
      </Card>

      {/* 5 KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          onClick={() => setDetailKind("receita")}
          icon={I3D.cartGreen}
          label="Receitas"
          value={formatBRL(receitas)}
          accent="text-emerald-700 dark:text-emerald-400"
          tint="from-emerald-50/60 to-background dark:from-emerald-950/20"
        >
          <div className="h-14 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={receitaTrend}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.12 150)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.12 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="valor" stroke="oklch(0.55 0.12 150)" fill="url(#gReceita)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        <KpiCard
          onClick={() => setDetailKind("fixo")}
          icon={I3D.house}
          label="Despesas Fixas"
          value={formatBRL(fixos)}
          accent="text-rose-600"
          tint="from-rose-50/60 to-background dark:from-rose-950/15"
        >
          <div className="h-14 mt-1">
            {fixosByCat.length === 0 ? <div className="text-xs text-muted-foreground">Sem dados</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fixosByCat.slice(0, 6)}>
                  <Bar dataKey="value" fill="oklch(0.62 0.14 25)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </KpiCard>

        <KpiCard
          onClick={() => setDetailKind("variavel")}
          icon={I3D.shoppingBagRed}
          label="Despesas Variáveis"
          value={formatBRL(variaveis)}
          accent="text-rose-600"
          tint="from-rose-50/60 to-background dark:from-rose-950/15"
        >
          <div className="h-14 mt-1 flex items-center">
            {variaveisByCat.length === 0 ? <div className="text-xs text-muted-foreground">Sem dados</div> : (
              <>
                <div className="size-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={variaveisByCat} dataKey="value" innerRadius={16} outerRadius={26}>
                        {variaveisByCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-2 space-y-0.5 text-[10px] flex-1">
                  {variaveisByCat.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center gap-1 text-muted-foreground">
                      <span className="size-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </KpiCard>

        <KpiCard
          onClick={() => setDetailKind("parcelamento")}
          icon={I3D.cardsCalendar}
          label="Parcelamentos"
          value={formatBRL(parcelas)}
        >
          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
            <div className="flex justify-between"><span>Total Pago</span><span>Total a Pagar</span></div>
            <div className="flex justify-between font-medium text-foreground">
              <span>{formatBRL(sumPaid("parcelamento"))}</span>
              <span>{formatBRL(sumPending("parcelamento"))}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-1 border-t">
              <span>Próximos 7 dias</span><span className="font-medium">{formatBRL(parcelas * 0.3)}</span>
            </div>
          </div>
        </KpiCard>

        <KpiCard
          icon={I3D.lockCoins}
          label="A pagar (total)"
          value={formatBRL(totalPendente)}
          accent="text-amber-600"
          tint="from-amber-50/40 to-background dark:from-amber-950/15"
        >
          <div className="text-[11px] text-muted-foreground mt-1">
            {tx.filter((t) => t.kind !== "receita" && t.status !== "pago").length} contas
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">Vencem nos próximos 7 dias</div>
          <button className="mt-2 text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
            <CalendarClock className="size-3" /> Ver Calendário de Vencimentos
          </button>
        </KpiCard>
      </div>

      {/* FLUXO + ALERTAS */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Fluxo financeiro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fluxo financeiro do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] items-center">
              <div className="space-y-4">
                <FlowNode icon={I3D.cartGreen} label="Receitas" value={formatBRL(receitas)} tint="bg-emerald-50 dark:bg-emerald-950/30" />
                <FlowNode icon={I3D.shoppingBagRed} label="Total de Despesas" value={formatBRL(totalDespesas)} tint="bg-rose-50 dark:bg-rose-950/30" />
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200/60 dark:border-rose-900/40">
                  <div className="text-xs text-muted-foreground">{isDeficit ? "Déficit" : "Superávit"} do mês</div>
                  <div className={`text-xl font-bold ${isDeficit ? "text-rose-600" : "text-emerald-700"}`}>{formatBRL(Math.abs(resultadoPrevisto))}</div>
                </div>
              </div>
              <div className="space-y-3">
                {flowBuckets.map((b) => {
                  const pct = totalDespesas > 0 ? Math.round((b.value / totalDespesas) * 100) : 0;
                  return (
                    <div key={b.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: b.color }} />
                          <span className="font-medium">{b.label}</span>
                          <span className="text-muted-foreground">{formatBRL(b.value)}</span>
                        </span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(b.value / fluxoMax) * 100}%`, background: b.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="size-4 text-primary" /> Alertas e avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cardTotals.filter((c) => !c.allPaid && c.total > 0).slice(0, 2).map((c) => (
              <AlertRow
                key={c.card.id}
                tone="amber"
                icon={<CreditCard className="size-4" />}
                title={`Cartão ${c.card.name} - ${c.card.titular ?? ""}`}
                subtitle={`Vence em ${c.card.due_day} dias · ${formatBRL(c.total)}`}
              />
            ))}
            {tx.filter((t) => t.kind === "parcelamento" && t.status !== "pago").length > 0 && (
              <AlertRow
                tone="violet"
                icon={<Bell className="size-4" />}
                title={`${tx.filter((t) => t.kind === "parcelamento" && t.status !== "pago").length} parcelas pendentes`}
                subtitle="Vencem nos próximos 7 dias"
              />
            )}
            <AlertRow
              tone="rose"
              icon={<TrendingDown className="size-4" />}
              title="Gastos aumentaram"
              subtitle="10% em relação ao mês passado"
            />
            {cardTotals.length === 0 && tx.every((t) => t.kind === "receita" || t.status === "pago") && (
              <AlertRow tone="emerald" icon={<CheckCircle2 className="size-4" />} title="Tudo em dia" subtitle="Nenhum pagamento pendente este mês." />
            )}
            <button className="w-full text-xs text-center text-primary hover:underline pt-1">Ver todos os alertas</button>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM: lançamentos | gastos categoria | cartões */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lançamentos recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Lançamentos recentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <a href="/lancamentos">Ver todos</a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos.</p>
            ) : recent.slice(0, 5).map((t) => {
              const isPago = t.status === "pago";
              return (
                <div key={t.id} className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-muted/40">
                  <img src={iconForCategory(t.category)} alt="" className="size-8 shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{formatDateBR(t.occurred_on)}</div>
                    <div className="text-sm font-medium truncate">{t.description ?? t.category}</div>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{t.category}</div>
                  <button onClick={() => toggleStatus(t)} className={`shrink-0 ${isPago ? "text-emerald-600" : "text-amber-500"}`}>
                    {isPago ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Gastos por categoria */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <a href="/relatorios">Ver relatório</a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topCategories.slice(0, 6).map((c) => {
              const max = topCategories[0]?.value ?? 1;
              const pct = (c.value / max) * 100;
              return (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <img src={iconForCategory(c.name)} alt="" className="size-6 shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs">{c.name}</span>
                      <span className="text-xs font-medium whitespace-nowrap">{formatBRL(c.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {topCategories.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
          </CardContent>
        </Card>

        {/* Resumo dos cartões */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Resumo dos cartões</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <a href="/cartoes">Ver todos</a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {cardTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
            ) : cardTotals.slice(0, 3).map((c) => {
              const brand = BANK_BRAND[c.card.bank.toUpperCase()] ?? BANK_BRAND.DEFAULT;
              const limit = Number(c.card.credit_limit) || 0;
              const used = c.openTotal;
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              const disponivel = Math.max(0, limit - used);
              return (
                <button key={c.card.id} onClick={() => setDetailCardId(c.card.id)} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                  <div className="size-9 rounded-lg grid place-items-center text-white text-[10px] font-bold shrink-0" style={{ background: brand.gradient }}>
                    {bankShort(c.card.bank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{c.card.bank} - {c.card.titular ?? c.card.name}</span>
                      <span className="font-semibold">{formatBRL(c.total)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {limit > 0
                        ? <>Limite: {formatBRL(limit)} · Usado: {formatBRL(used)} · Disp: {formatBRL(disponivel)}</>
                        : <>Sem limite cadastrado · Venc: {String(c.card.due_day).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}</>}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "oklch(0.62 0.18 25)" : "oklch(0.6 0.12 150)" }} />
                    </div>
                    <div className="text-[10px] text-right text-muted-foreground mt-0.5">{limit > 0 ? `${pct}% utilizado · fatura atual ${formatBRL(c.total)}` : "—"}</div>
                  </div>
                </button>
              );
            })}
            {cardTotals.length > 0 && (
              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total utilizado</span>
                <span className="font-semibold">{formatBRL(cardTotals.reduce((s, c) => s + c.total, 0))}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Minhas contas (dados da aba Contas) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="size-4 text-emerald-600" /> Minhas contas
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
            <a href="/contas">Gerenciar</a>
          </Button>
        </CardHeader>
        <CardContent>
          {visibleAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada. <a href="/contas" className="text-primary underline">Cadastrar agora</a>.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAccounts.map((a) => (
                <div key={a.id} className="rounded-xl border bg-card p-3 flex items-center gap-3 hover:shadow-sm transition">
                  <div className="size-10 rounded-lg grid place-items-center bg-emerald-500/10 text-emerald-700 shrink-0">
                    <Wallet className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground truncate">{a.bank ?? a.type} · {a.titular ?? "—"}</div>
                    <div className="font-medium text-sm truncate">{a.name}</div>
                    <div className={`text-base font-bold ${Number(a.balance) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                      {formatBRL(Number(a.balance))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-dashed bg-muted/30 p-3 flex flex-col justify-center">
                <div className="text-xs text-muted-foreground">Saldo total das contas</div>
                <div className={`text-xl font-bold ${totalContas >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                  {formatBRL(totalContas)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      <DetailDialog
        kind={detailKind}
        onClose={() => setDetailKind(null)}
        transactions={tx}
        monthLabel={monthLabel}
        onToggleStatus={toggleStatus}
      />
      <CardDetailDialog
        cardId={detailCardId}
        onClose={() => setDetailCardId(null)}
        transactions={tx}
        cards={cards}
        monthLabel={monthLabel}
        isFatturaPaga={currentClosed}
      />
    </div>
  );
}

function KpiCard({
  icon, label, value, accent, tint, onClick, children,
}: {
  icon: string; label: string; value: string;
  accent?: string; tint?: string; onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/40 ${tint ? `bg-gradient-to-br ${tint}` : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <img src={icon} alt="" className="size-10 shrink-0" loading="lazy" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold tracking-tight ${accent ?? ""}`}>{value}</div>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function FlowNode({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${tint}`}>
      <img src={icon} alt="" className="size-10 shrink-0" loading="lazy" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

function AlertRow({ tone, icon, title, subtitle }: { tone: "amber" | "violet" | "rose" | "emerald"; icon: React.ReactNode; title: string; subtitle: string }) {
  const styles = {
    amber: "border-amber-300/60 bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
    violet: "border-violet-300/60 bg-violet-50/80 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400",
    rose: "border-rose-300/60 bg-rose-50/80 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400",
    emerald: "border-emerald-300/60 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${styles}`}>
      <div className="size-8 rounded-full bg-white/70 dark:bg-black/20 grid place-items-center shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </div>
  );
}

function PaidPendingRow({ paid, pending }: { paid: number; pending: number }) {
  if (paid === 0 && pending === 0) {
    return <div className="mt-1 text-[11px] text-muted-foreground">Sem lançamentos</div>;
  }
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-2.5" /> Pago {formatBRL(paid)}
      </span>
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Circle className="size-2.5" /> Pendente {formatBRL(pending)}
      </span>
    </div>
  );
}

const BANK_SHORT: Record<string, string> = {
  NUBANK: "NU", INTER: "INTER", ITAU: "ITAU", BRADESCO: "BRAD", SANTANDER: "SAN",
  CAIXA: "CEF", "BANCO DO BRASIL": "BB", BB: "BB", C6: "C6", XP: "XP", PICPAY: "PIC",
};
function bankShort(bank: string): string {
  const k = (bank || "").toUpperCase().trim();
  return BANK_SHORT[k] ?? k.slice(0, 4);
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
  cardId, onClose, transactions, cards, monthLabel, isFatturaPaga,
}: {
  cardId: string | null;
  onClose: () => void;
  transactions: Tx[];
  cards: CardRow[];
  monthLabel: string;
  isFatturaPaga: boolean;
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
              className="rounded-lg p-4 text-white relative overflow-hidden"
              style={{ background: brand.gradient }}
            >
              {isFatturaPaga && (
                <Badge className="absolute right-3 top-3 bg-emerald-500 text-white border-0 gap-1">
                  <CheckCircle2 className="size-3" /> Fatura paga
                </Badge>
              )}
              <div className="text-xs uppercase tracking-wider opacity-80">Total da fatura</div>
              <div className={`text-3xl font-bold tracking-tight ${isFatturaPaga ? "line-through opacity-70" : ""}`}>{formatBRL(total)}</div>
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
                        <TableCell className="whitespace-nowrap">{formatDateBR(t.occurred_on)}</TableCell>
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
  kind, onClose, transactions, monthLabel, onToggleStatus,
}: {
  kind: string | null;
  onClose: () => void;
  transactions: Tx[];
  monthLabel: string;
  onToggleStatus: (t: Tx) => void;
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => {
                      const isPago = t.status === "pago";
                      return (
                      <TableRow key={t.id} className={isPago ? "bg-emerald-500/5" : ""}>
                        <TableCell className="whitespace-nowrap">{formatDateBR(t.occurred_on)}</TableCell>
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
                        <TableCell>
                          {kind !== "receita" ? (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(t)}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                isPago
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                              }`}
                            >
                              {isPago ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                              {isPago ? "Liquidado" : "Pendente"}
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={`text-right font-medium whitespace-nowrap ${meta.accent} ${isPago && kind !== "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                          {formatBRL(Number(t.amount))}
                        </TableCell>
                      </TableRow>
                      );
                    })}
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

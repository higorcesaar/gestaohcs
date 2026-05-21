import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { formatBRL, formatDateBR, parseLocalDate } from "@/lib/finance-constants";
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, CalendarClock, Coins,
  Eye, ChevronRight, ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  CheckCircle2, Circle, Landmark, UtensilsCrossed, Car, Home, Zap,
  ShoppingBag, BookOpen, Music, Smartphone, Heart, Stethoscope, Shirt,
  Lock, ChevronDown, Calendar, PiggyBank, Target, Plus,
} from "lucide-react";
import { MonthSelector } from "./relatorios";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { useClosedMonths } from "@/hooks/use-closed-months";
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

const PIE_COLORS = [
  "oklch(0.55 0.06 150)", "oklch(0.65 0.1 130)", "oklch(0.5 0.1 280)",
  "oklch(0.72 0.1 90)", "oklch(0.6 0.12 200)", "oklch(0.68 0.13 30)",
  "oklch(0.45 0.08 160)", "oklch(0.58 0.11 320)", "oklch(0.7 0.08 60)",
  "oklch(0.5 0.05 250)",
];

const CATEGORY_ICONS: Record<string, typeof Wallet> = {
  Supermercado: ShoppingCart,
  Mercado: ShoppingCart,
  Aluguel: Home,
  Água: Zap,
  Luz: Zap,
  Energia: Zap,
  Internet: Smartphone,
  Telefone: Smartphone,
  Transporte: Car,
  Uber: Car,
  Combustível: Car,
  Gasolina: Car,
  Educação: BookOpen,
  Escola: BookOpen,
  Saúde: Heart,
  Médico: Stethoscope,
  Farmácia: Heart,
  Vestuário: Shirt,
  Roupa: Shirt,
  Lazer: Music,
  Restaurante: UtensilsCrossed,
  Ifood: UtensilsCrossed,
  Delivery: UtensilsCrossed,
  Assinatura: BookOpen,
  Streaming: Music,
  Freelancer: DollarSign,
  Salário: DollarSign,
  Banco: Landmark,
};

function getCategoryIcon(category: string) {
  const found = Object.entries(CATEGORY_ICONS).find(([key]) =>
    category.toLowerCase().includes(key.toLowerCase())
  );
  return found ? found[1] : Wallet;
}

function Dashboard() {
  const now = new Date();
  const navigate = useNavigate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tx, setTx] = useState<Tx[]>([]);
  const [prevTx, setPrevTx] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<{ id: string; name: string; target_amount: number; current_amount: number }[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [detailKind, setDetailKind] = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [hideSaldo, setHideSaldo] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const { titular } = useTitular();
  const { closedMonths, isClosed, close, reopen, loading: closedLoading } = useClosedMonths();

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
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthIso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonthIso = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const currentClosed = isClosed(currentMonthIso);
  const monthLabelShort = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long" });
  const prevMonthLabel = prevMonthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const fetchMonth = async (iso: string, signal?: AbortSignal) => {
    const [y, m] = iso.split("-").map(Number);
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 1).toISOString().slice(0, 10);
    let q = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", start).lt("competence_month", end)
      .order("occurred_on", { ascending: false });
    if (signal) q = q.abortSignal(signal);
    q = applyTitular(q, titular);
    const { data } = await q;
    return (data ?? []) as Tx[];
  };

  useEffect(() => {
    const ac = new AbortController();
    const currentIso = currentMonthIso;
    const prevIso = prevMonthIso;

    fetchMonth(currentIso, ac.signal).then(setTx);
    fetchMonth(prevIso, ac.signal).then(setPrevTx);

    supabase.from("goals").select("*").then(({ data }) => setGoals((data ?? []) as { id: string; name: string; target_amount: number; current_amount: number }[]));
    supabase.from("cards").select("id, name, bank, titular, closing_day, due_day").then(({ data }) => setCards((data ?? []) as CardRow[]));

    return () => ac.abort();
  }, [year, month, titular]);

  const visibleCards = useMemo(
    () => cards.filter((c) => titular === "all" || !c.titular || c.titular === titular),
    [cards, titular],
  );

  const cardTotals = useMemo(() => {
    return visibleCards.map((c) => {
      const items = tx.filter((t) => t.payment_method === "Crédito" && t.card_id === c.id);
      const total = items.reduce((s, t) => s + Number(t.amount), 0);
      const paidCount = items.filter((t) => t.status === "pago").length;
      const allPaid = items.length > 0 && paidCount === items.length;
      return { card: c, total, count: items.length, paidCount, allPaid, items };
    });
  }, [visibleCards, tx]);

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

  const sumKind = (data: Tx[], k: string) => data.filter((t) => t.kind === k).reduce((s, t) => s + Number(t.amount), 0);
  const sumPaidKind = (data: Tx[], k: string) => data.filter((t) => t.kind === k && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0);
  const sumPendingKind = (data: Tx[], k: string) => data.filter((t) => t.kind === k && t.status !== "pago").reduce((s, t) => s + Number(t.amount), 0);

  const receitas = sumKind(tx, "receita");
  const fixos = sumKind(tx, "fixo");
  const variaveis = sumKind(tx, "variavel");
  const parcelas = sumKind(tx, "parcelamento");

  const totalPago = tx
    .filter((t) => t.kind !== "receita" && t.status === "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalPendente = tx
    .filter((t) => t.kind !== "receita" && t.status !== "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const saldoConta = receitas - totalPago;
  const totalDespesas = fixos + variaveis + parcelas;
  const resultadoPrevisto = receitas - totalDespesas;

  const prevReceitas = sumKind(prevTx, "receita");
  const prevFixos = sumKind(prevTx, "fixo");
  const prevVariaveis = sumKind(prevTx, "variavel");
  const prevParcelas = sumKind(prevTx, "parcelamento");
  const prevTotalDespesas = prevFixos + prevVariaveis + prevParcelas;

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const receitaPct = pctChange(receitas, prevReceitas);
  const fixosPct = pctChange(fixos, prevFixos);
  const variaveisPct = pctChange(variaveis, prevVariaveis);
  const parcelasPct = pctChange(parcelas, prevParcelas);
  const despesasPct = pctChange(totalDespesas, prevTotalDespesas);

  async function refresh() {
    const d = await fetchMonth(currentMonthIso);
    setTx(d);
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

  const fixosBarData = useMemo(() => {
    return fixosByCat.slice(0, 11);
  }, [fixosByCat]);

  const recent = tx.slice(0, 5);

  const categoriaTotal = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [tx]);

  const categoriaMax = Math.max(...categoriaTotal.map((c) => c.value), 1);

  const parcelasPendentes = useMemo(() => {
    return tx.filter((t) => t.kind === "parcelamento" && t.status !== "pago");
  }, [tx]);

  const proximos7Dias = useMemo(() => {
    const hoje = new Date();
    const seteDias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    return parcelasPendentes
      .filter((t) => {
        const d = parseLocalDate(t.occurred_on);
        return d >= hoje && d <= seteDias;
      })
      .reduce((s, t) => s + Number(t.amount), 0);
  }, [parcelasPendentes]);

  const proximos30Dias = useMemo(() => {
    const hoje = new Date();
    const trintaDias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    return parcelasPendentes
      .filter((t) => {
        const d = parseLocalDate(t.occurred_on);
        return d > new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000) && d <= trintaDias;
      })
      .reduce((s, t) => s + Number(t.amount), 0);
  }, [parcelasPendentes]);

  const contasPendentes = tx.filter((t) => t.kind !== "receita" && t.status !== "pago").length;

  const fluxoPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      const cat = t.kind === "fixo" ? "Gastos Fixos" : t.kind === "variavel" ? "Gastos Variáveis" : "Parcelamentos";
      map[cat] = (map[cat] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [tx]);

  const cardTotalGeral = cardTotals.reduce((s, c) => s + c.total, 0);
  const maxCardTotal = Math.max(...cardTotals.map((c) => c.total), 1);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const pctBadge = (pct: number, positiveIsGood = false) => {
    const isPositive = pct > 0;
    const isNeutral = pct === 0;
    const color = isNeutral ? "text-muted-foreground" :
      positiveIsGood ? (isPositive ? "text-emerald-600" : "text-red-500") :
      (isPositive ? "text-red-500" : "text-emerald-600");
    return (
      <span className={`text-xs font-medium ${color}`}>
        {isNeutral ? "0%" : isPositive ? `+${pct}%` : `${pct}%`}
        <span className="text-muted-foreground font-normal"> vs {prevMonthLabel}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">Visão geral do mês de {monthLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        </div>
      </div>

      {/* Row 1: Saldo atual - full width */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHideSaldo(!hideSaldo)}
                  className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                >
                  <Eye className="size-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Saldo atual</span>
                    {receitaPct !== 0 && (
                      <Badge variant="secondary" className="text-[11px] font-normal gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15">
                        <TrendingUp className="size-3" />
                        {receitaPct > 0 ? "+" : ""}{receitaPct}% em relação a {prevMonthLabel}
                      </Badge>
                    )}
                  </div>
                  <div className={`text-4xl font-bold tracking-tight ${hideSaldo ? "blur-lg select-none" : ""} ${saldoConta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                    {formatBRL(saldoConta)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Receitas</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" />
                    <span className="text-lg font-semibold text-emerald-600">{formatBRL(receitas)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Despesas</span>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="size-4 text-red-500" />
                    <span className="text-lg font-semibold text-red-500">{formatBRL(totalDespesas)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Resultado previsto</span>
                  <div className={`text-lg font-semibold ${resultadoPrevisto >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {resultadoPrevisto >= 0 ? "+" : ""}{formatBRL(resultadoPrevisto)}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate({ to: "/relatorios" })}>
                Ver detalhes completos <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: 5 KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {/* Receitas */}
        <Card onClick={() => setDetailKind("receita")} className="cursor-pointer transition-all hover:border-emerald-500/60 hover:shadow-sm border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receitas</CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-emerald-600">{formatBRL(receitas)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{pctBadge(receitaPct)}</div>
            <div className="h-12 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={receitaTrend}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="valor" stroke="#16a34a" fill="url(#gReceita)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Despesas Fixas */}
        <Card onClick={() => setDetailKind("fixo")} className="cursor-pointer transition-all hover:border-orange-400/60 hover:shadow-sm border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Despesas Fixas</CardTitle>
            <Wallet className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">{formatBRL(fixos)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{pctBadge(fixosPct)}</div>
            <div className="h-12 mt-2">
              {fixosBarData.length === 0 ? (
                <div className="text-[10px] text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fixosBarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Bar dataKey="value" fill="#f97316" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Despesas Variáveis */}
        <Card onClick={() => setDetailKind("variavel")} className="cursor-pointer transition-all hover:border-orange-400/60 hover:shadow-sm border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Despesas Variáveis</CardTitle>
            <ShoppingCart className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">{formatBRL(variaveis)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{pctBadge(variaveisPct)}</div>
            <div className="h-12 mt-2 flex items-center justify-center">
              {variaveisByCat.length === 0 ? (
                <div className="text-[10px] text-muted-foreground">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={variaveisByCat} dataKey="value" innerRadius={14} outerRadius={22}>
                      {variaveisByCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parcelamentos */}
        <Card onClick={() => setDetailKind("parcelamento")} className="cursor-pointer transition-all hover:border-violet-400/60 hover:shadow-sm border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Parcelamentos</CardTitle>
            <CreditCard className="size-4 text-violet-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">{formatBRL(parcelas)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{pctBadge(parcelasPct)}</div>
            <div className="mt-2 space-y-0.5 text-[11px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Próximos 7 dias</span>
                <span className="font-medium text-foreground">{formatBRL(proximos7Dias)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Próximos 30 dias</span>
                <span className="font-medium text-foreground">{formatBRL(proximos30Dias)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* A pagar (total) */}
        <Card className="cursor-pointer transition-all hover:border-amber-400/60 hover:shadow-sm border-border/40 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">A pagar (total)</CardTitle>
            <CalendarClock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-amber-600">{formatBRL(totalPendente)}</div>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div className="text-muted-foreground">{contasPendentes} {contasPendentes === 1 ? "conta" : "contas"}</div>
              <div className="text-amber-600 font-medium">Vencem nos próximos 7 dias</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Fluxo financeiro + Alertas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Fluxo financeiro */}
        <Card className="lg:col-span-2 border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fluxo financeiro do mês</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Sankey-like flow diagram */}
            <div className="flex flex-col gap-4">
              {/* Top level: Receitas -> Despesas -> Resultado */}
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Receitas</div>
                  <div className="text-lg font-bold text-emerald-600">{formatBRL(receitas)}</div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-[2] rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-center">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total de Despesas</div>
                  <div className="text-lg font-bold text-red-500">{formatBRL(totalDespesas)}</div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground shrink-0" />
                <div className={`flex-1 rounded-lg border p-3 text-center ${resultadoPrevisto >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Déficit do mês</div>
                  <div className={`text-lg font-bold ${resultadoPrevisto >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {resultadoPrevisto >= 0 ? "+" : ""}{formatBRL(resultadoPrevisto)}
                  </div>
                </div>
              </div>

              {/* Sankey branches: despesas sub-categories */}
              <div className="relative">
                <div className="grid grid-cols-4 gap-2">
                  {fluxoPorCategoria.map((cat, i) => {
                    const pct = totalDespesas > 0 ? Math.round((cat.value / totalDespesas) * 100) : 0;
                    const colors = [
                      "bg-orange-500/20 border-orange-400/40",
                      "bg-amber-500/20 border-amber-400/40",
                      "bg-violet-500/20 border-violet-400/40",
                      "bg-blue-500/20 border-blue-400/40",
                    ];
                    return (
                      <div key={cat.name} className={`rounded-lg border ${colors[i % colors.length]} p-2 text-center`}>
                        <div className="text-[10px] text-muted-foreground truncate">{cat.name}</div>
                        <div className="text-sm font-semibold">{formatBRL(cat.value)}</div>
                        <div className="text-[10px] text-muted-foreground">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas e avisos */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" /> Alertas e avisos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {cardTotals.filter((c) => !c.allPaid && c.total > 0).slice(0, 3).map((c) => (
              <div
                key={c.card.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
                onClick={() => setDetailCardId(c.card.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className="size-5 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">Cartão {c.card.name}</div>
                    <div className="text-xs text-muted-foreground">Vence dia {c.card.due_day} · {formatBRL(c.total)}</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            ))}
            {tx.filter((t) => t.kind === "parcelamento" && t.status !== "pago").length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Wallet className="size-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{tx.filter((t) => t.kind === "parcelamento" && t.status !== "pago").length} parcelas pendentes</div>
                    <div className="text-xs text-muted-foreground">Acompanhe no Histórico</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            )}
            {despesasPct > 5 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 cursor-pointer hover:bg-red-500/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <TrendingUp className="size-5 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Gastos aumentaram {despesasPct}%</div>
                    <div className="text-xs text-muted-foreground">Em relação ao mês anterior</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </div>
            )}
            {totalPendente === 0 && cardTotals.every((c) => c.allPaid || c.total === 0) && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Tudo em dia</div>
                    <div className="text-xs text-muted-foreground">Nenhum pagamento pendente</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: 3-col grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lançamentos recentes */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Lançamentos recentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate({ to: "/lancamentos" })}>
              Ver todos <ChevronRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem lançamentos neste mês.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((t) => {
                  const Icon = getCategoryIcon(t.category);
                  const isEntrada = t.kind === "receita";
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                      <div className={`rounded-lg p-1.5 ${isEntrada ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.description || t.category}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDateBR(t.occurred_on)} · {t.category}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold whitespace-nowrap ${isEntrada ? "text-emerald-600" : "text-red-500"}`}>
                        {isEntrada ? "+" : "-"}{formatBRL(Number(t.amount))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gastos por categoria */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Gastos por categoria</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate({ to: "/relatorios" })}>
              Ver relatório <ChevronRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {categoriaTotal.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem dados.</p>
            ) : (
              <div className="space-y-3">
                {categoriaTotal.map((cat) => {
                  const pct = Math.round((cat.value / categoriaMax) * 100);
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate">{cat.name}</span>
                        <span className="text-muted-foreground">{formatBRL(cat.value)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/30 flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{formatBRL(totalDespesas)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo dos cartões */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Resumo dos cartões</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => setDetailCardId(cardTotals[0]?.card.id ?? null)}>
              Ver todos <ChevronRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {cardTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem cartões.</p>
            ) : (
              <div className="space-y-4">
                {cardTotals.slice(0, 3).map(({ card, total, count }) => {
                  const pct = maxCardTotal > 0 ? Math.round((total / maxCardTotal) * 100) : 0;
                  const brand = BANK_BRAND[card.bank.toUpperCase()] ?? BANK_BRAND.DEFAULT;
                  return (
                    <div key={card.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="rounded-md p-1"
                            style={{ background: brand.gradient }}
                          >
                            <CreditCard className="size-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium truncate">{card.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatBRL(total)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(pct, 3)}%`,
                            background: brand.gradient,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{card.bank} · {card.titular || "—"}</span>
                        <span>{pct}% utilizado</span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/30 flex justify-between text-sm font-medium">
                  <span>Total utilizado</span>
                  <span>{formatBRL(cardTotalGeral)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

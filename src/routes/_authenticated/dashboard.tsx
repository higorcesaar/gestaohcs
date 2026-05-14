import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { formatBRL } from "@/lib/finance-constants";
import { TrendingUp, Wallet, TrendingDown, CreditCard } from "lucide-react";
import { MonthSelector } from "./relatorios";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Tx {
  id: string; occurred_on: string; kind: string; category: string; amount: number;
}
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
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    supabase.from("transactions")
      .select("id, occurred_on, kind, category, amount")
      .gte("occurred_on", start).lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .then(({ data }) => setTx((data ?? []) as Tx[]));
    supabase.from("goals").select("*")
      .then(({ data }) => setGoals((data ?? []) as Goal[]));
  }, [year, month]);

  const sum = (k: string) => tx.filter((t) => t.kind === k).reduce((s, t) => s + Number(t.amount), 0);
  const receitas = sum("receita");
  const fixos = sum("fixo");
  const variaveis = sum("variavel");
  const parcelas = sum("parcelamento");

  // Receita weekly trend
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

  // Donut for fixos by category
  const fixosByCat = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind === "fixo").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [tx]);

  // Bars for variáveis by category
  const variaveisByCat = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind === "variavel").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [tx]);

  // Parcelamentos list
  const parcList = useMemo(() => {
    return tx.filter((t) => t.kind === "parcelamento").slice(0, 4);
  }, [tx]);

  // Weekly balance analysis
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

  // Maiores gastos por categoria (donut)
  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [tx]);

  const recent = tx.slice(0, 6);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </header>

      {/* KPI cards with mini-charts */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
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

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Gastos Fixos</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(fixos)}</div>
            <div className="h-16 mt-2">
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

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Gastos Variáveis</CardTitle>
            <TrendingDown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(variaveis)}</div>
            <div className="h-16 mt-2">
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

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Parcelamentos</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatBRL(parcelas)}</div>
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

      {/* Análise + Metas */}
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
            ) : goals.slice(0, 5).map((g) => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Lançamentos recentes + Maiores gastos */}
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
          <CardContent className="h-[280px]">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
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
    </div>
  );
}

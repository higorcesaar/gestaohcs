import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { formatBRL } from "@/lib/finance-constants";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { useSetPageHeader } from "@/hooks/use-page-header";

export const Route = createFileRoute("/_authenticated/relatorios-consolidados")({
  component: Consolidados,
});

interface Tx { competence_month: string; occurred_on: string; kind: string; amount: number; }

function Consolidados() {
  const [tx, setTx] = useState<Tx[]>([]);
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const { titular } = useTitular();

  useEffect(() => {
    // pega ano corrente + ano anterior (para projetar fixos baseados em meses passados)
    const start = `${year - 1}-01-01`;
    const end = `${year + 1}-01-01`;
    let q = supabase.from("transactions")
      .select("competence_month, occurred_on, kind, amount")
      .gte("competence_month", start).lt("competence_month", end);
    q = applyTitular(q, titular);
    q.then(({ data }) => setTx((data ?? []) as Tx[]));
  }, [year, titular]);

  const data = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i],
      Receitas: 0, Fixos: 0, Variáveis: 0, Parcelamentos: 0, projetado: false,
    }));

    // Real (current year)
    for (const t of tx) {
      const [y, m] = t.competence_month.split("-").map(Number);
      if (y !== year) continue;
      const idx = m - 1;
      const amt = Number(t.amount);
      if (t.kind === "receita") months[idx].Receitas += amt;
      if (t.kind === "fixo") months[idx].Fixos += amt;
      if (t.kind === "variavel") months[idx].Variáveis += amt;
      if (t.kind === "parcelamento") months[idx].Parcelamentos += amt;
    }

    // Projeção para meses futuros
    // 1) Fixos: replicar média dos últimos 3 meses fechados
    const fixosFechados: number[] = [];
    for (let i = 0; i < currentMonth; i++) {
      if (months[i].Fixos > 0) fixosFechados.push(months[i].Fixos);
    }
    const fixoMedia = fixosFechados.length
      ? fixosFechados.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, fixosFechados.length)
      : 0;

    // 2) Parcelamentos: usar competência futura já cadastrada (já contabilizada acima).
    for (let i = currentMonth; i < 12; i++) {
      months[i].projetado = i > currentMonth;
      if (i > currentMonth && months[i].Fixos === 0 && fixoMedia > 0) {
        months[i].Fixos = Math.round(fixoMedia * 100) / 100;
      }
    }
    return months;
  }, [tx, year, currentMonth]);

  useSetPageHeader(
    () => ({
      title: "Relatórios Consolidados",
      subtitle: `Visão anual ${year} (com projeção dos meses futuros).`,
    }),
    [year]
  );

  return (
    <div className="space-y-8">


      <Card>
        <CardHeader><CardTitle className="text-base">Comparativo mensal</CardTitle></CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receitas" fill="oklch(0.62 0.12 150)" />
              <Bar dataKey="Fixos" fill="oklch(0.55 0.06 150)" />
              <Bar dataKey="Variáveis" fill="oklch(0.7 0.08 130)" />
              <Bar dataKey="Parcelamentos" fill="oklch(0.5 0.1 280)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tabela anual</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Fixos</TableHead>
                <TableHead className="text-right">Variáveis</TableHead>
                <TableHead className="text-right">Parcelamentos</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const saldo = row.Receitas - row.Fixos - row.Variáveis - row.Parcelamentos;
                return (
                  <TableRow key={row.mes} className={row.projetado ? "opacity-70" : ""}>
                    <TableCell>
                      {row.mes}
                      {row.projetado && <span className="ml-1 text-[10px] text-muted-foreground">(prev.)</span>}
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(row.Receitas)}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.Fixos)}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.Variáveis)}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.Parcelamentos)}</TableCell>
                    <TableCell className={`text-right font-medium ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatBRL(saldo)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

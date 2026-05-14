import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/relatorios-consolidados")({
  component: Consolidados,
});

interface Tx { occurred_on: string; kind: string; amount: number; }

function Consolidados() {
  const [tx, setTx] = useState<Tx[]>([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    supabase.from("transactions")
      .select("occurred_on, kind, amount")
      .gte("occurred_on", start).lt("occurred_on", end)
      .then(({ data }) => setTx((data ?? []) as Tx[]));
  }, [year]);

  const data = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i],
      Receitas: 0, Fixos: 0, Variáveis: 0, Parcelamentos: 0,
    }));
    for (const t of tx) {
      const m = new Date(t.occurred_on).getMonth();
      const amt = Number(t.amount);
      if (t.kind === "receita") months[m].Receitas += amt;
      if (t.kind === "fixo") months[m].Fixos += amt;
      if (t.kind === "variavel") months[m].Variáveis += amt;
      if (t.kind === "parcelamento") months[m].Parcelamentos += amt;
    }
    return months;
  }, [tx]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Relatórios Consolidados</h1>
        <p className="text-muted-foreground">Visão anual {year}.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Comparativo mensal</CardTitle></CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
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
                  <TableRow key={row.mes}>
                    <TableCell>{row.mes}</TableCell>
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

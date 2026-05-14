import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatBRL, KINDS } from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: Relatorios,
});

interface Tx { id: string; occurred_on: string; kind: string; category: string; amount: number; }

function Relatorios() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tx, setTx] = useState<Tx[]>([]);

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().slice(0, 10);
    const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
    supabase.from("transactions")
      .select("id, occurred_on, kind, category, amount")
      .gte("occurred_on", start).lt("occurred_on", end)
      .then(({ data }) => setTx((data ?? []) as Tx[]));
  }, [year, month]);

  const byKind = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tx) map[t.kind] = (map[t.kind] ?? 0) + Number(t.amount);
    return map;
  }, [tx]);

  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tx) map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [tx]);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Relatórios</h1>
          <p className="text-muted-foreground">Visão mensal por tipo e categoria.</p>
        </div>
        <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {KINDS.map((k) => (
          <Card key={k.value}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-semibold">{formatBRL(byKind[k.value] ?? 0)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
        <CardContent>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados neste período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Categoria</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {byCat.map(([c, v]) => (
                  <TableRow key={c}>
                    <TableCell>{c}</TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(v)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function MonthSelector({
  year, month, onChange,
}: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  const months = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => onChange(year, Number(v))}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {months.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onChange(Number(v), month)}>
        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

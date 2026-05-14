import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/finance-constants";
import { TrendingDown, TrendingUp, Wallet, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Tx {
  id: string;
  occurred_on: string;
  kind: string;
  category: string;
  amount: number;
  titular: string | null;
  payment_method: string | null;
}

function Dashboard() {
  const [tx, setTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = new Date();
    start.setDate(1);
    const startStr = start.toISOString().slice(0, 10);
    supabase
      .from("transactions")
      .select("id, occurred_on, kind, category, amount, titular, payment_method")
      .gte("occurred_on", startStr)
      .order("occurred_on", { ascending: false })
      .then(({ data }) => {
        setTx((data ?? []) as Tx[]);
        setLoading(false);
      });
  }, []);

  const sum = (k: string) =>
    tx.filter((t) => t.kind === k).reduce((s, t) => s + Number(t.amount), 0);

  const fixos = sum("fixo");
  const variaveis = sum("variavel");
  const parcelas = sum("parcelamento");
  const receitas = sum("receita");
  const saldo = receitas - (fixos + variaveis + parcelas);

  const byCategory = Object.entries(
    tx
      .filter((t) => t.kind !== "receita")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const max = Math.max(1, ...byCategory.map(([, v]) => v));

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground capitalize">{monthName}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Receitas" value={formatBRL(receitas)} icon={TrendingUp} accent="success" />
        <KpiCard title="Gastos Fixos" value={formatBRL(fixos)} icon={Wallet} />
        <KpiCard title="Gastos Variáveis" value={formatBRL(variaveis)} icon={TrendingDown} />
        <KpiCard title="Parcelamentos" value={formatBRL(parcelas)} icon={CreditCard} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo do mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-semibold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
            {formatBRL(saldo)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Receitas menos a soma de fixos, variáveis e parcelamentos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maiores gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
          ) : (
            <ul className="space-y-3">
              {byCategory.map(([cat, val]) => (
                <li key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat}</span>
                    <span className="font-medium">{formatBRL(val)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(val / max) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, accent,
}: { title: string; value: string; icon: React.ComponentType<{ className?: string }>; accent?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className={`size-4 ${accent === "success" ? "text-success" : "text-muted-foreground"}`} />
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

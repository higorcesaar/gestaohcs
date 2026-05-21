import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, PiggyBank, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/planejamento")({
  component: Planejamento,
});

function Planejamento() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold flex items-center gap-3">
          <CalendarRange className="size-7 text-primary" /> Planejamento
        </h1>
        <p className="text-muted-foreground">Organize seus próximos passos financeiros.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="size-5 text-primary" /> Orçamento mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina seu orçamento por categoria e acompanhe em tempo real.
            </p>
            <Button asChild size="sm">
              <Link to="/orcamentos">
                Abrir Gestão Orçamentária <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" /> Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crie metas de poupança e acompanhe o avanço.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/metas">
                Minhas metas <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Próximos meses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use o seletor de mês no Dashboard ou em Lançamentos para revisar competências futuras
              de parcelas e despesas recorrentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TITULARES } from "@/lib/finance-constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configuracoes,
});

function Configuracoes() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<string>("light");
  const [titular, setTitular] = useState<string>("");
  const [currency, setCurrency] = useState<string>("BRL");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setTheme(data.theme ?? "light");
        setTitular(data.default_titular ?? "");
        setCurrency(data.currency ?? "BRL");
      }
    });
  }, [user?.id]);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id, theme, default_titular: titular || null, currency,
    }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("Preferências salvas");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold flex items-center gap-3"><Settings className="size-7 text-primary" /> Configurações</h1>
        <p className="text-muted-foreground">Personalize sua experiência.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Preferências</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tema</label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Titular padrão</label>
            <Select value={titular || "all"} onValueChange={(v) => setTitular(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TITULARES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Moeda</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (BRL)</SelectItem>
                <SelectItem value="USD">Dólar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save}>Salvar preferências</Button>
        </CardContent>
      </Card>
    </div>
  );
}

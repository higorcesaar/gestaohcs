import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useSetPageHeader } from "@/hooks/use-page-header";

export const Route = createFileRoute("/_authenticated/backup")({
  component: Backup,
});

const TABLES = ["transactions", "categories", "cards", "goals", "accounts", "monthly_budgets", "category_budgets", "closed_months", "user_preferences"] as const;

function Backup() {
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    setBusy(true);
    try {
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        if (error) throw error;
        dump[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cesar-financas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function exportCsv() {
    const { data, error } = await supabase.from("transactions").select("*");
    if (error) return toast.error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return toast.info("Sem lançamentos.");
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => JSON.stringify((r as Record<string, unknown>)[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const dump = JSON.parse(text) as Record<string, Record<string, unknown>[]>;
      for (const t of TABLES) {
        const rows = dump[t];
        if (!rows?.length) continue;
        // remove id para deixar o banco gerar; assume mesma RLS por user_id
        const sanitized = rows.map((r) => { const { id, ...rest } = r as { id?: string }; void id; return rest; });
        const { error } = await supabase.from(t).insert(sanitized as never);
        if (error) console.warn(t, error.message);
      }
      toast.success("Importação concluída");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  useSetPageHeader(
    () => ({
      title: <span className="flex items-center gap-2"><Database className="size-5 text-primary" /> Backup e Dados</span>,
      subtitle: "Exporte ou restaure todos os seus dados.",
    }),
    []
  );

  return (
    <div className="space-y-6">


      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="size-5" /> Exportar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Baixe um arquivo JSON com todos os seus dados.</p>
            <div className="flex gap-2">
              <Button onClick={exportAll} disabled={busy}>Backup completo (JSON)</Button>
              <Button variant="outline" onClick={exportCsv} disabled={busy}>Lançamentos (CSV)</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="size-5" /> Importar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Restaure dados a partir de um arquivo JSON exportado anteriormente.</p>
            <input
              type="file" accept="application/json"
              onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
              className="block text-sm"
              disabled={busy}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

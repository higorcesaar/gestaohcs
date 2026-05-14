import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  KINDS, TITULARES, PAYMENT_METHODS, BANKS, categoriesFor, formatBRL,
} from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: Lancamentos,
});

interface Tx {
  id: string;
  occurred_on: string;
  kind: string;
  category: string;
  titular: string | null;
  payment_method: string | null;
  bank: string | null;
  description: string | null;
  amount: number;
  installments_total: number | null;
  installment_no: number | null;
}

function Lancamentos() {
  const { user } = useAuth();
  const [list, setList] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const [kind, setKind] = useState("variavel");
  const [category, setCategory] = useState("");
  const [titular, setTitular] = useState("");
  const [payment, setPayment] = useState("");
  const [bank, setBank] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [instTotal, setInstTotal] = useState("");
  const [instNo, setInstNo] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setList((data ?? []) as Tx[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!category) {
      toast.error("Selecione uma categoria");
      return;
    }
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      occurred_on: date,
      kind,
      category,
      titular: titular || null,
      payment_method: payment || null,
      bank: bank || null,
      description: description || null,
      amount: value,
      installments_total: instTotal ? Number(instTotal) : null,
      installment_no: instNo ? Number(instNo) : null,
    });
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Lançamento adicionado");
    setAmount(""); setDescription(""); setInstNo(""); setInstTotal("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); load(); }
  }

  const categories = categoriesFor(kind);
  const showInstallments = kind === "parcelamento";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Lançamentos</h1>
        <p className="text-muted-foreground">Cadastre gastos fixos, variáveis, parcelamentos e receitas.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo lançamento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-3">
            <Field label="Tipo">
              <Select value={kind} onValueChange={(v) => { setKind(v); setCategory(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Valor (R$)">
              <Input
                inputMode="decimal" placeholder="0,00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Titular">
              <Select value={titular} onValueChange={setTitular}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {TITULARES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Forma de pagamento">
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Banco">
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="md:col-span-2">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </Field>
            {showInstallments && (
              <>
                <Field label="Parcela atual">
                  <Input type="number" min={1} value={instNo} onChange={(e) => setInstNo(e.target.value)} />
                </Field>
                <Field label="Total de parcelas">
                  <Input type="number" min={1} value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
                </Field>
              </>
            )}
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Adicionar lançamento</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(t.occurred_on).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{kindLabel(t.kind)}</Badge></TableCell>
                    <TableCell>
                      {t.category}
                      {t.installment_no && t.installments_total && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({t.installment_no}/{t.installments_total})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{t.titular ?? "—"}</TableCell>
                    <TableCell>{t.payment_method ?? "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${t.kind === "receita" ? "text-success" : ""}`}>
                      {formatBRL(Number(t.amount))}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function kindLabel(k: string) {
  return KINDS.find((x) => x.value === k)?.label ?? k;
}

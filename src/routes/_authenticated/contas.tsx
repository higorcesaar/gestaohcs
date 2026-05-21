import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, BANKS, TITULARES } from "@/lib/finance-constants";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Landmark, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contas")({
  component: Contas,
});

interface Account {
  id: string;
  name: string;
  bank: string | null;
  type: string;
  balance: number;
  color: string | null;
  titular: string | null;
}

function Contas() {
  const { user } = useAuth();
  const [items, setItems] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bank: "",
    type: "corrente",
    balance: "",
    titular: "",
  });

  useEffect(() => {
    load();
  }, []);
  async function load() {
    const { data } = await supabase.from("accounts").select("*").order("name");
    setItems((data ?? []) as Account[]);
  }

  async function save() {
    if (!user || !form.name) return;
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: form.name,
      bank: form.bank || null,
      type: form.type,
      balance: Number(form.balance) || 0,
      titular: form.titular || null,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ name: "", bank: "", type: "corrente", balance: "", titular: "" });
    toast.success("Conta criada");
    load();
  }

  async function del(id: string) {
    await supabase.from("accounts").delete().eq("id", id);
    load();
  }

  const total = items.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <Landmark className="size-7 text-primary" /> Contas
          </h1>
          <p className="text-muted-foreground">
            Saldo total: <span className="font-medium text-foreground">{formatBRL(total)}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="size-4" /> Nova conta
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Minhas contas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma conta cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.bank ?? "—"}</TableCell>
                  <TableCell className="capitalize">{a.type}</TableCell>
                  <TableCell>{a.titular ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(Number(a.balance))}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => del(a.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome (ex: Conta Corrente Inter)"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Select value={form.bank} onValueChange={(v) => setForm((p) => ({ ...p, bank: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.titular}
              onValueChange={(v) => setForm((p) => ({ ...p, titular: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Titular" />
              </SelectTrigger>
              <SelectContent>
                {TITULARES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Saldo inicial"
              type="number"
              value={form.balance}
              onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

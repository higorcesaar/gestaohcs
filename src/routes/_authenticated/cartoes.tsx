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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BANKS, TITULARES } from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/cartoes")({
  component: Cartoes,
});

interface CardRow {
  id: string; name: string; bank: string; closing_day: number; due_day: number; titular: string | null;
  dias_antecedencia_fechamento: number;
}

function Cartoes() {
  const { user } = useAuth();
  const [list, setList] = useState<CardRow[]>([]);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("NUBANK");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [diasAntec, setDiasAntec] = useState("7");
  const [titular, setTitular] = useState("");

  async function load() {
    const { data } = await supabase.from("cards").select("*").order("name");
    setList((data ?? []) as CardRow[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cd = Number(closingDay);
    const dd = Number(dueDay);
    if (!name.trim() || !bank || !cd || !dd) return toast.error("Preencha todos os campos");
    if (cd < 1 || cd > 31 || dd < 1 || dd > 31) return toast.error("Dia deve estar entre 1 e 31");

    const { error } = await supabase.from("cards").insert({
      user_id: user.id, name: name.trim(), bank, closing_day: cd, due_day: dd,
      titular: titular || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Cartão cadastrado");
    setName(""); setClosingDay(""); setDueDay(""); setTitular("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); load(); }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Cartões</h1>
        <p className="text-muted-foreground">Cadastre cartões com dia de fechamento e vencimento para automatizar a competência das compras no crédito.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo cartão</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank Roxinho" />
            </div>
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titular</Label>
              <Select value={titular} onValueChange={setTitular}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {TITULARES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia de fechamento</Label>
              <Input type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento</Label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Cadastrar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cartões cadastrados</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.bank}</TableCell>
                    <TableCell>{c.titular ?? "—"}</TableCell>
                    <TableCell>Dia {c.closing_day}</TableCell>
                    <TableCell>Dia {c.due_day}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
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

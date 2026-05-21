import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BANKS, TITULARES } from "@/lib/finance-constants";

export const Route = createFileRoute("/_authenticated/cartoes")({
  component: Cartoes,
});

interface CardRow {
  id: string;
  name: string;
  bank: string;
  closing_day: number;
  due_day: number;
  titular: string | null;
  dias_antecedencia_fechamento: number;
  credit_limit: number;
}

function Cartoes() {
  const { user } = useAuth();
  const [list, setList] = useState<CardRow[]>([]);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("NUBANK");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [diasAntec, setDiasAntec] = useState("7");
  const [creditLimit, setCreditLimit] = useState("");
  const [titular, setTitular] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("cards").select("*").order("name");
    setList((data ?? []) as CardRow[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const cd = Number(closingDay);
    const dd = Number(dueDay);
    const da = Number(diasAntec) || 7;
    if (!name.trim() || !bank || !cd || !dd) return toast.error("Preencha todos os campos");
    if (cd < 1 || cd > 31 || dd < 1 || dd > 31) return toast.error("Dia deve estar entre 1 e 31");
    if (da < 1 || da > 28) return toast.error("Dias de antecedência deve estar entre 1 e 28");

    const cl = Number(creditLimit) || 0;
    const payload = {
      name: name.trim(),
      bank,
      closing_day: cd,
      due_day: dd,
      dias_antecedencia_fechamento: da,
      credit_limit: cl,
      titular: titular || null,
    };

    if (editingId) {
      const { error } = await supabase.from("cards").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Cartão atualizado");
    } else {
      const { error } = await supabase.from("cards").insert({ ...payload, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Cartão cadastrado");
    }
    cancelEdit();
    load();
  }

  function startEdit(c: CardRow) {
    setEditingId(c.id);
    setName(c.name);
    setBank(c.bank);
    setClosingDay(String(c.closing_day));
    setDueDay(String(c.due_day));
    setDiasAntec(String(c.dias_antecedencia_fechamento));
    setCreditLimit(c.credit_limit > 0 ? String(c.credit_limit) : "");
    setTitular(c.titular ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setClosingDay("");
    setDueDay("");
    setDiasAntec("7");
    setCreditLimit("");
    setTitular("");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removido");
      load();
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Cartões</h1>
        <p className="text-muted-foreground">
          Cadastre cartões com dia de fechamento e vencimento para automatizar a competência das
          compras no crédito.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Editar cartão" : "Novo cartão"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank Roxinho"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titular</Label>
              <Select value={titular} onValueChange={setTitular}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TITULARES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia de fechamento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias de antecedência do fechamento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={diasAntec}
                onChange={(e) => setDiasAntec(e.target.value)}
                placeholder="7"
              />
              <p className="text-[11px] text-muted-foreground">
                Distância em dias entre vencimento e fechamento (Inter = 7).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Limite (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartões cadastrados</CardTitle>
        </CardHeader>
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
                  <TableHead>Limite</TableHead>
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
                      {c.credit_limit > 0 ? `R$ ${c.credit_limit.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                        <Pencil className="size-4" />
                      </Button>
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

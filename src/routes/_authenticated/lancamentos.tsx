import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import {
  KINDS, TITULARES, PAYMENT_METHODS, BANKS, formatBRL,
  computeCompetenceMonth, addMonths, formatDateBR, formatCompetenceBR,
  computeDueDate,
} from "@/lib/finance-constants";

import { useCategories, ensureCategory } from "@/hooks/use-categories";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { useClosedMonths } from "@/hooks/use-closed-months";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: Lancamentos,
});

interface Tx {
  id: string;
  occurred_on: string;
  competence_month: string;
  kind: string;
  category: string;
  titular: string | null;
  payment_method: string | null;
  bank: string | null;
  description: string | null;
  amount: number;
  installments_total: number | null;
  installment_no: number | null;
  card_id: string | null;
  status: string;
}

interface CardRow {
  id: string; name: string; bank: string; closing_day: number; due_day: number; titular: string | null;
}

function Lancamentos() {
  const { user } = useAuth();
  const { titular: gTitular } = useTitular();
  const [list, setList] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRow[]>([]);

  const [kind, setKind] = useState("variavel");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [titular, setTitular] = useState("");
  const [payment, setPayment] = useState("");
  const [bank, setBank] = useState("");
  const [cardId, setCardId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [instTotal, setInstTotal] = useState("");
  const [instNo, setInstNo] = useState("");
  const [status, setStatus] = useState<"pendente" | "pago">("pendente");
  const [search, setSearch] = useState("");
  const [competenceFilter, setCompetenceFilter] = useState<string>("all");

  const { list: categories, reload: reloadCats } = useCategories(kind);
  const { closedMonths } = useClosedMonths();

  async function load() {
    setLoading(true);
    let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(200);
    q = applyTitular(q, gTitular);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setList((data ?? []) as Tx[]);
    setLoading(false);
  }

  async function loadCards() {
    const { data } = await supabase.from("cards").select("*").order("name");
    setCards((data ?? []) as CardRow[]);
  }

  useEffect(() => { load(); }, [gTitular]);
  useEffect(() => { loadCards(); }, []);

  const isCard = payment === "Crédito" || payment === "Débito";
  const filteredCards = cards.filter((c) => !titular || !c.titular || c.titular === titular);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) return toast.error("Informe um valor válido");

    let categoryName = category;
    if (newCategory.trim()) {
      categoryName = await ensureCategory(user.id, kind, newCategory);
      reloadCats();
    }
    if (!categoryName) return toast.error("Selecione ou crie uma categoria");

    if (!payment) return toast.error("Selecione a forma de pagamento");
    if (payment !== "Dinheiro" && !bank && !cardId) return toast.error("Banco/Cartão obrigatório");

    let selectedCard: CardRow | null = null;
    let bankName = bank || null;
    if (isCard && cardId) {
      selectedCard = cards.find((c) => c.id === cardId) ?? null;
      if (selectedCard) bankName = selectedCard.bank;
    }

    const baseCompetence = computeCompetenceMonth(
      date, payment, payment === "Crédito" ? selectedCard?.closing_day ?? null : null,
      closedMonths,
    );

    const total = Number(instTotal) || 1;
    const startNo = Number(instNo) || 1;
    const isParcel = kind === "parcelamento" && total > 1;
    const rows = [];
    if (isParcel) {
      for (let i = 0; i < total - (startNo - 1); i++) {
        rows.push({
          user_id: user.id,
          occurred_on: date,
          competence_month: addMonths(baseCompetence, i),
          kind,
          category: categoryName,
          titular: titular || null,
          payment_method: payment,
          bank: bankName,
          card_id: selectedCard?.id ?? null,
          description: description || null,
          amount: value,
          installments_total: total,
          installment_no: startNo + i,
          status,
        });
      }
    } else {
      rows.push({
        user_id: user.id,
        occurred_on: date,
        competence_month: baseCompetence,
        kind,
        category: categoryName,
        titular: titular || null,
        payment_method: payment,
        bank: bankName,
        card_id: selectedCard?.id ?? null,
        description: description || null,
        amount: value,
        installments_total: kind === "parcelamento" ? total : null,
        installment_no: kind === "parcelamento" ? startNo : null,
        status,
      });
    }

    const { error } = await supabase.from("transactions").insert(rows);
    if (error) return toast.error("Erro ao salvar", { description: error.message });

    toast.success(isParcel ? `${rows.length} parcelas registradas` : "Lançamento adicionado");
    setAmount(""); setDescription(""); setInstNo(""); setInstTotal(""); setNewCategory("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); load(); }
  }

  async function toggleStatus(t: Tx) {
    const next = t.status === "pago" ? "pendente" : "pago";
    const { error } = await supabase
      .from("transactions")
      .update({ status: next })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(next === "pago" ? "Marcado como pago" : "Marcado como pendente");
    setList((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x));
  }

  const showInstallments = kind === "parcelamento";

  const cardNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cards) m[c.id] = `${c.name} (${c.bank})`;
    return m;
  }, [cards]);

  const competenceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of list) set.add(t.competence_month);
    return Array.from(set).sort().reverse();
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (competenceFilter !== "all" && t.competence_month !== competenceFilter) return false;
      // regra: parcelas > 1 só aparecem quando filtrando pela sua competência
      if (competenceFilter === "all" && t.installment_no && t.installment_no > 1) return false;
      if (!q) return true;
      const cardName = t.card_id ? cardNameById[t.card_id] ?? "" : "";
      const haystack = [
        t.description ?? "", t.category ?? "", t.bank ?? "",
        cardName, String(t.amount), formatBRL(Number(t.amount)),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [list, search, competenceFilter, cardNameById]);

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
                  {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nova categoria (opcional)">
              <div className="flex gap-2">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Ex: Pet" />
                <Plus className="size-4 text-muted-foreground self-center" />
              </div>
            </Field>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {(() => {
                const sel = cards.find((c) => c.id === cardId) ?? null;
                const preview = computeCompetenceMonth(
                  date, payment, payment === "Crédito" ? sel?.closing_day ?? null : null,
                  closedMonths,
                );
                const base = computeCompetenceMonth(
                  date, payment, payment === "Crédito" ? sel?.closing_day ?? null : null,
                  [],
                );
                const shifted = preview !== base;
                const label = formatCompetenceBR(preview);
                const due = payment === "Crédito" && sel?.due_day
                  ? computeDueDate(preview, sel.due_day) : null;
                return (
                  <div className="space-y-0.5">
                    <p className={`text-xs ${shifted ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      Competência: <span className="capitalize font-medium">{label}</span>
                      {shifted ? " · mês anterior já fechado" : ""}
                    </p>
                    {due && (
                      <p className="text-xs text-muted-foreground">
                        Vencimento: <span className="font-medium">{formatDateBR(due)}</span>
                      </p>
                    )}
                  </div>
                );
              })()}
            </Field>
            <Field label="Valor (R$)">
              <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
              <Select value={payment} onValueChange={(v) => { setPayment(v); setBank(""); setCardId(""); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {payment === "Dinheiro" ? (
              <Field label="Banco"><Input disabled placeholder="—" /></Field>
            ) : isCard ? (
              <Field label="Cartão">
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
                  <SelectContent>
                    {filteredCards.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Cadastre cartões na aba Cartões
                      </div>
                    ) : filteredCards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.bank})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field label="Banco">
                <Select value={bank} onValueChange={setBank}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Descrição" className="md:col-span-2">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </Field>
            {showInstallments && (
              <>
                <Field label="Parcela inicial">
                  <Input type="number" min={1} value={instNo} onChange={(e) => setInstNo(e.target.value)} placeholder="1" />
                </Field>
                <Field label="Total de parcelas">
                  <Input type="number" min={1} value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
                </Field>
              </>
            )}
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as "pago" | "pendente")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago / Liquidado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Adicionar lançamento</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              placeholder="Buscar por descrição, categoria, valor ou cartão…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as competências</SelectItem>
                {competenceOptions.map((c) => (
                  <SelectItem key={c} value={c}>{formatCompetenceBR(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((t) => {
                  const isPago = t.status === "pago";
                  return (
                  <TableRow key={t.id} className={isPago ? "bg-emerald-500/5" : ""}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateBR(t.occurred_on)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatCompetenceBR(t.competence_month)}
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
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          isPago
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                        }`}
                        title="Clique para alternar"
                      >
                        {isPago ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                        {isPago ? "Liquidado" : "Pendente"}
                      </button>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${t.kind === "receita" ? "text-success" : ""} ${isPago && t.kind !== "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                      {formatBRL(Number(t.amount))}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
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

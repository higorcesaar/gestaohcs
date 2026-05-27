import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bell, Calendar, CreditCard, User, Filter, Plus, ChevronRight,
  ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingBag, Trash2,
  LayoutGrid, List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  KINDS, TITULARES, PAYMENT_METHODS, BANKS, formatBRL,
  computeCompetenceMonth, addMonths, formatCompetenceBR,
} from "@/lib/finance-constants";

import { useCategories, ensureCategory } from "@/hooks/use-categories";
import { useTitular, applyTitular } from "@/hooks/use-titular";
import { useClosedMonths } from "@/hooks/use-closed-months";
import { useSetPageHeader } from "@/hooks/use-page-header";
import { iconForCategory } from "@/lib/category-icons";

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
  id: string; name: string; bank: string; closing_day: number; due_day: number;
  titular: string | null; dias_antecedencia_fechamento?: number | null;
}

type QuickFilter = "todos" | "hoje" | "semana" | "mes" | "pendentes" | "receitas" | "despesas";

const TYPE_OPTIONS = [
  { value: "receita",     label: "Receita",   Icon: ArrowUpRight,   tint: "emerald" },
  { value: "fixo",        label: "Fixo",      Icon: Calendar,       tint: "blue" },
  { value: "variavel",    label: "Variável",  Icon: ShoppingBag,    tint: "orange" },
  { value: "parcelamento",label: "Parcelado", Icon: CreditCard,     tint: "violet" },
] as const;

function Lancamentos() {
  const { user } = useAuth();
  const { titular: gTitular } = useTitular();
  const [list, setList] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CardRow[]>([]);

  const [kind, setKind] = useState<string>("variavel");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [titular, setTitular] = useState<string>(TITULARES[0]);
  const [payment, setPayment] = useState<string>("Crédito");
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
  const [status] = useState<"pendente" | "pago">("pendente");

  const [quick, setQuick] = useState<QuickFilter>("todos");
  const [sort, setSort] = useState<"recent" | "old" | "amount">("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  const [visibleCount, setVisibleCount] = useState(5);
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
  });

  // Reset paginação ao trocar filtro/ordem/mês
  useEffect(() => { setVisibleCount(5); }, [quick, sort, monthFilter, view]);

  const { list: categories, reload: reloadCats } = useCategories(kind);
  const { closedMonths } = useClosedMonths();

  async function load() {
    setLoading(true);
    let q = supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(500);
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
    let bankName: string | null = bank || null;
    if (isCard && cardId) {
      selectedCard = cards.find((c) => c.id === cardId) ?? null;
      if (selectedCard) bankName = selectedCard.bank;
    }

    const baseCompetence = computeCompetenceMonth(
      date, payment, payment === "Crédito" ? selectedCard : null, closedMonths,
    );

    const total = Number(instTotal) || 1;
    const startNo = Number(instNo) || 1;
    const isParcel = kind === "parcelamento" && total > 1;
    const rows: any[] = [];
    if (isParcel) {
      for (let i = 0; i < total - (startNo - 1); i++) {
        rows.push({
          user_id: user.id, occurred_on: date,
          competence_month: addMonths(baseCompetence, i),
          kind, category: categoryName, titular: titular || null,
          payment_method: payment, bank: bankName, card_id: selectedCard?.id ?? null,
          description: description || null, amount: value,
          installments_total: total, installment_no: startNo + i, status,
        });
      }
    } else {
      rows.push({
        user_id: user.id, occurred_on: date, competence_month: baseCompetence,
        kind, category: categoryName, titular: titular || null,
        payment_method: payment, bank: bankName, card_id: selectedCard?.id ?? null,
        description: description || null, amount: value,
        installments_total: kind === "parcelamento" ? total : null,
        installment_no: kind === "parcelamento" ? startNo : null, status,
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
    const { error } = await supabase.from("transactions").update({ status: next }).eq("id", t.id);
    if (error) return toast.error(error.message);
    setList((prev) => prev.map((x) => x.id === t.id ? { ...x, status: next } : x));
  }

  const showInstallments = kind === "parcelamento";

  // ---- Stats (mês do filtro) ----
  const monthList = useMemo(
    () => list.filter((t) => t.competence_month === monthFilter),
    [list, monthFilter],
  );
  const stats = useMemo(() => {
    const receitas = monthList.filter((t) => t.kind === "receita").reduce((s, t) => s + Number(t.amount), 0);
    const despesas = monthList.filter((t) => t.kind !== "receita").reduce((s, t) => s + Number(t.amount), 0);
    return { total: monthList.length, receitas, despesas };
  }, [monthList]);
  const pendentesCount = useMemo(
    () => monthList.filter((t) => t.status !== "pago").length,
    [monthList],
  );

  // ---- Filtro rápido ----
  const filtered = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const weekIso = weekStart.toISOString().slice(0, 10);

    const base = list.filter((t) => {
      if (t.installment_no && t.installment_no > 1 && quick !== "mes") {
        // parcelas só aparecem agrupadas por competência
      }
      switch (quick) {
        case "hoje":     return t.occurred_on === today;
        case "semana":   return t.occurred_on >= weekIso;
        case "mes":      return t.competence_month === monthFilter;
        case "pendentes":return t.status !== "pago" && t.competence_month === monthFilter;
        case "receitas": return t.kind === "receita" && t.competence_month === monthFilter;
        case "despesas": return t.kind !== "receita" && t.competence_month === monthFilter;
        default:         return true; // todos
      }
    });

    const arr = [...base];
    if (sort === "recent") arr.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
    if (sort === "old")    arr.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    if (sort === "amount") arr.sort((a, b) => Number(b.amount) - Number(a.amount));
    return arr;
  }, [list, quick, sort, monthFilter]);

  // Opções do seletor de mês (12 meses centrados em hoje)
  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const n = new Date();
    const base = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
    for (let i = 6; i >= -5; i--) opts.push(addMonths(base, -i));
    return opts;
  }, []);

  useSetPageHeader(
    () => ({
      title: "Lançamentos",
      subtitle: "Registre e acompanhe todas as suas movimentações financeiras.",
      actions: (
        <>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl bg-card">
              <Calendar className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">{formatCompetenceBR(m).replace("/", " / ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button className="relative grid place-items-center size-9 rounded-xl border bg-card hover:bg-accent transition-colors">
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-emerald-500" />
          </button>
        </>
      ),
    }),
    [monthFilter, monthOptions]
  );

  return (
    <div className="space-y-6 pb-24">


      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total de lançamentos" sub="Neste mês"
          value={String(stats.total)} tone="neutral"
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          ring="bg-emerald-100/70"
        />
        <StatCard
          label="Receitas" sub="Neste mês"
          value={`+${formatBRL(stats.receitas)}`} tone="success"
          icon={<ArrowUpRight className="size-5 text-emerald-700" />}
          ring="bg-emerald-100"
          bg="bg-emerald-50/70 dark:bg-emerald-500/5"
        />
        <StatCard
          label="Despesas" sub="Neste mês"
          value={`-${formatBRL(stats.despesas)}`} tone="danger"
          icon={<ArrowDownRight className="size-5 text-orange-600" />}
          ring="bg-orange-100"
          bg="bg-orange-50/70 dark:bg-orange-500/5"
        />
      </div>

      {/* QUICK FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={quick === "todos"}     onClick={() => setQuick("todos")}     variant="solid">Todos</Chip>
        <Chip active={quick === "hoje"}      onClick={() => setQuick("hoje")}>Hoje</Chip>
        <Chip active={quick === "semana"}    onClick={() => setQuick("semana")}>Semana</Chip>
        <Chip active={quick === "mes"}       onClick={() => setQuick("mes")}      tint="emerald">Mês</Chip>
        <Chip active={quick === "pendentes"} onClick={() => setQuick("pendentes")} dot="orange">
          Pendentes{pendentesCount > 0 && <span className="ml-1 text-[10px] opacity-70">({pendentesCount})</span>}
        </Chip>
        <Chip active={quick === "receitas"}  onClick={() => setQuick("receitas")} tint="emerald">Receitas</Chip>
        <Chip active={quick === "despesas"}  onClick={() => setQuick("despesas")} tint="orange">Despesas</Chip>
        <button className="ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-full border bg-card text-sm hover:bg-accent transition-colors">
          <Filter className="size-4" /> Filtros
        </button>
      </div>

      {/* NOVO LANÇAMENTO */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center size-7 rounded-full bg-emerald-100 text-emerald-700">
              <Plus className="size-4" />
            </span>
            <h2 className="text-lg font-semibold">Novo lançamento</h2>
          </div>

          <form onSubmit={add} className="space-y-5">
            {/* Tipo */}
            <div>
              <p className="text-sm font-medium mb-2">Tipo</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TYPE_OPTIONS.map(({ value, label, Icon, tint }) => {
                  const active = kind === value;
                  const tones: Record<string, string> = {
                    emerald: "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700",
                    blue:    "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10 text-blue-700",
                    orange:  "border-orange-500 bg-orange-50/60 dark:bg-orange-500/10 text-orange-700",
                    violet:  "border-violet-500 bg-violet-50/60 dark:bg-violet-500/10 text-violet-700",
                  };
                  return (
                    <button key={value} type="button"
                      onClick={() => { setKind(value); setCategory(""); }}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all hover:shadow-sm ${
                        active ? tones[tint] : "border-border bg-card text-foreground hover:border-muted-foreground/30"
                      }`}>
                      <Icon className="size-5 shrink-0" />
                      <span className="font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoria / Valor */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categoria">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor">
                <div className="relative">
                  <Input
                    inputMode="decimal" placeholder="R$ 0,00"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="h-11 rounded-xl bg-emerald-50/50 border-emerald-200/60 text-2xl font-semibold text-emerald-700 placeholder:text-emerald-600/40 dark:bg-emerald-500/10"
                  />
                </div>
              </Field>
            </div>

            {/* Data / Pagamento / Titular */}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Data">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 pl-9 rounded-xl" />
                </div>
              </Field>
              <Field label="Pagamento">
                <Select value={payment} onValueChange={(v) => { setPayment(v); setBank(""); setCardId(""); }}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Titular">
                <Select value={titular} onValueChange={setTitular}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <User className="size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TITULARES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Banco/Cartão condicional */}
            {payment !== "Dinheiro" && (
              <div className="grid gap-4 md:grid-cols-2">
                {isCard ? (
                  <Field label="Cartão">
                    <Select value={cardId} onValueChange={setCardId}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
                      <SelectContent>
                        {filteredCards.length === 0
                          ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Cadastre cartões na aba Cartões</div>
                          : filteredCards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.bank})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field label="Banco">
                    <Select value={bank} onValueChange={setBank}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field label="Nova categoria (opcional)">
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Ex: Pet" className="h-11 rounded-xl" />
                </Field>
              </div>
            )}

            {showInstallments && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Parcela inicial">
                  <Input type="number" min={1} value={instNo} onChange={(e) => setInstNo(e.target.value)} placeholder="1" className="h-11 rounded-xl" />
                </Field>
                <Field label="Total de parcelas">
                  <Input type="number" min={1} value={instTotal} onChange={(e) => setInstTotal(e.target.value)} className="h-11 rounded-xl" />
                </Field>
              </div>
            )}

            {/* Descrição + botão */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <Field label="Descrição">
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="h-11 rounded-xl" />
              </Field>
              <Button type="submit" className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5">
                <Plus className="size-4" /> Adicionar lançamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* HISTÓRICO */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Histórico de lançamentos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"} · mostrando {Math.min(visibleCount, filtered.length)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="h-9 rounded-lg bg-card w-[150px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="old">Mais antigos</SelectItem>
                <SelectItem value="amount">Maior valor</SelectItem>
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              <button type="button" onClick={() => setView("grid")}
                className={`grid place-items-center size-8 rounded-md transition-all duration-200 ${view === "grid" ? "bg-emerald-600 text-white shadow-sm" : "hover:bg-accent/60"}`}>
                <LayoutGrid className="size-4" />
              </button>
              <button type="button" onClick={() => setView("list")}
                className={`grid place-items-center size-8 rounded-md transition-all duration-200 ${view === "list" ? "bg-emerald-600 text-white shadow-sm" : "hover:bg-accent/60"}`}>
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</CardContent></Card>
        ) : (
          <>
            <div className="rounded-2xl border bg-card/60 shadow-sm overflow-hidden">
              {view === "list" && (
                <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/60 backdrop-blur border-b">
                  <div className="col-span-5 sm:col-span-4 pl-14">Descrição</div>
                  <div className="hidden sm:block sm:col-span-3">Pagamento</div>
                  <div className="hidden md:block md:col-span-2">Data</div>
                  <div className="hidden md:block md:col-span-1 text-center">Status</div>
                  <div className="col-span-7 sm:col-span-2 text-right pr-10">Valor</div>
                </div>
              )}
              <div className="max-h-[480px] overflow-y-auto overscroll-contain">
                <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2 p-3" : "divide-y divide-border/60"}>
                  {filtered.slice(0, visibleCount).map((t) => (
                    <TxRow key={t.id} t={t} view={view} onToggle={() => toggleStatus(t)} onDelete={() => remove(t.id)} />
                  ))}
                </div>
              </div>
            </div>

            {visibleCount < filtered.length && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + 10)}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full border bg-card text-sm font-medium hover:bg-accent hover:shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Ver mais
                  <span className="text-xs text-muted-foreground">
                    (+{Math.min(10, filtered.length - visibleCount)})
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>


      {/* FAB Novo */}
      <button
        type="button"
        onClick={() => document.querySelector<HTMLInputElement>('input[inputmode="decimal"]')?.focus()}
        className="fixed bottom-6 right-6 z-40 inline-flex flex-col items-center"
      >
        <span className="grid place-items-center size-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition">
          <Plus className="size-6" />
        </span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">Novo</span>
      </button>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  label, sub, value, icon, ring, bg, tone,
}: {
  label: string; sub: string; value: string;
  icon: React.ReactNode; ring: string; bg?: string;
  tone: "neutral" | "success" | "danger";
}) {
  const valueClass = tone === "success" ? "text-emerald-700"
    : tone === "danger" ? "text-orange-600"
    : "text-foreground";
  return (
    <div className={`rounded-2xl border p-5 ${bg ?? "bg-card"} shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className={`grid place-items-center size-12 rounded-full ${ring}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children, active, onClick, variant, tint, dot,
}: {
  children: React.ReactNode; active?: boolean; onClick?: () => void;
  variant?: "solid"; tint?: "emerald" | "orange"; dot?: "orange";
}) {
  let cls = "h-9 px-4 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 ";
  if (active && variant === "solid") cls += "bg-emerald-700 text-white border-emerald-700";
  else if (active && tint === "emerald") cls += "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10";
  else if (active && tint === "orange") cls += "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10";
  else if (active) cls += "bg-accent text-foreground border-border";
  else cls += "bg-card text-foreground/80 border-border hover:bg-accent";
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
      {dot && <span className={`size-2 rounded-full ${dot === "orange" ? "bg-orange-500" : "bg-emerald-500"}`} />}
    </button>
  );
}

function TxRow({
  t, view = "list", onToggle, onDelete,
}: {
  t: Tx; view?: "list" | "grid";
  onToggle: () => void; onDelete: () => void;
}) {
  const isReceita = t.kind === "receita";
  const isPago = t.status === "pago";
  const icon = iconForCategory(t.category);
  const dateLabel = formatDateBR(t.occurred_on);
  const rel = relativeLabel(t.occurred_on);
  const KindIcon = isReceita ? ArrowUpRight : ArrowDownRight;

  const wrapperCls = view === "grid"
    ? "group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:shadow-sm hover:-translate-y-px transition-all duration-200"
    : "group grid grid-cols-12 gap-3 items-center px-4 py-2.5 hover:bg-accent/40 transition-all duration-200";

  if (view === "grid") {
    return (
      <div className={wrapperCls}>
        <div className="grid place-items-center size-10 shrink-0 rounded-full bg-muted/60 overflow-hidden">
          <img src={icon} alt="" className="size-7 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate flex items-center gap-1.5">
            <KindIcon className={`size-3.5 ${isReceita ? "text-emerald-600" : "text-orange-500"}`} aria-hidden />
            {t.category}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {t.payment_method ?? "—"} · {dateLabel}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums ${isReceita ? "text-emerald-700" : "text-orange-600"}`}>
            {isReceita ? "" : "-"}{formatBRL(Number(t.amount))}
          </p>
          <button type="button" onClick={onToggle}
            className={`mt-0.5 inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium transition-colors ${
              isPago ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10"
                     : "bg-orange-50 text-orange-700 dark:bg-orange-500/10"
            }`}>
            {isPago ? "Pago" : "Pendente"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperCls}>
      <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
        <div className="grid place-items-center size-10 shrink-0 rounded-full bg-muted/60 overflow-hidden ring-1 ring-border/40">
          <img src={icon} alt="" className="size-7 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate flex items-center gap-1.5">
            <KindIcon className={`size-3.5 shrink-0 ${isReceita ? "text-emerald-600" : "text-orange-500"}`} aria-hidden />
            <span className="truncate">{t.category}</span>
          </p>
          {t.description && <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>}
        </div>
      </div>

      <div className="hidden sm:block sm:col-span-3 min-w-0">
        <p className="text-xs font-medium truncate">{t.payment_method ?? "—"}</p>
        <p className="text-[11px] text-muted-foreground truncate">{t.bank ?? "—"}</p>
      </div>

      <div className="hidden md:flex md:col-span-2 items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
        <Calendar className="size-3.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-foreground text-xs leading-tight">{dateLabel}</p>
          <p className="leading-tight">{rel}</p>
        </div>
      </div>

      <div className="hidden md:flex md:col-span-1 justify-center">
        <button type="button" onClick={onToggle}
          aria-label={`Marcar como ${isPago ? "pendente" : "pago"}`}
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 ${
            isPago ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 hover:bg-emerald-100"
                   : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 hover:bg-orange-100"
          }`}>
          <span className={`size-1.5 rounded-full ${isPago ? "bg-emerald-500" : "bg-orange-500"}`} />
          {isPago ? "Pago" : "Pendente"}
        </button>
      </div>

      <div className="col-span-7 sm:col-span-2 flex items-center justify-end gap-1">
        <p className={`text-sm font-bold tabular-nums ${isReceita ? "text-emerald-700" : "text-orange-600"}`}>
          {isReceita ? "" : "-"}{formatBRL(Number(t.amount))}
        </p>
        <button type="button" onClick={onDelete}
          aria-label="Remover lançamento"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity grid place-items-center size-7 rounded-full hover:bg-destructive/10 text-destructive">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}


function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function relativeLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff > 1 && diff < 7) {
    return ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dt.getDay()];
  }
  if (diff < 0) return "Futuro";
  return "";
}

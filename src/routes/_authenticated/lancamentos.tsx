import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
  dias_antecedencia_fechamento?: number | null; credit_limit?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  uber: "🚗", "99": "🚗", lazer: "🎮", restaurante: "🍽️",
  alimentação: "🛒", lanches: "🍔", farmácia: "💊", transporte: "🚌",
  cinema: "🎬", estacionamento: "🅿️", presentes: "🎁", oferta: "💰",
  doações: "🤝", shope: "📦", construção: "🔨",
  celular: "📱", computador: "💻", relógio: "⌚", viagem: "✈️",
  hospedagem: "🏨", óculos: "👓", roupas: "👕",
  salário: "💼", freelance: "💻", rendimento: "📈", outros: "📋",
  mei: "🏢", financiamento: "🏠", feira: "🥬", iptu: "🏛️", ipva: "🚗",
  energia: "⚡", água: "💧", internet: "🌐", streaming: "📺",
  gás: "🔥", salão: "💇", barbearia: "💈", academia: "🏋️",
  "plano de saúde": "🏥", faculdade: "🎓", dízimo: "⛪", seguro: "🛡️",
  consórcio: "📋", mercado: "🛒", padaria: "🥖", gasolina: "⛽",
};

function iconForCategory(cat: string): string {
  const key = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  if (key.includes("freela")) return "💻";
  if (key.includes("mcdonald") || key.includes("mc")) return "🍔";
  return "📄";
}

const TYPE_BUTTONS = [
  { label: "🌱 Receita", value: "receita" },
  { label: "📌 Fixo", value: "fixo" },
  { label: "📦 Variável", value: "variavel" },
  { label: "💳 Parcelado", value: "parcelamento" },
];

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
  const [activeFilter, setActiveFilter] = useState("mes");
  const [page, setPage] = useState(1);
  const ITENS_PER_PAGE = 10;

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

  function todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }

  function weekBoundaries() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`,
      end: `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`,
    };
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = todayStr();
    const week = weekBoundaries();
    return list.filter((t) => {
      if (competenceFilter !== "all" && t.competence_month !== competenceFilter) return false;
      if (competenceFilter === "all" && t.installment_no && t.installment_no > 1) return false;
      if (activeFilter === "hoje" && t.occurred_on !== today) return false;
      if (activeFilter === "semana" && (t.occurred_on < week.start || t.occurred_on > week.end)) return false;
      if (activeFilter === "pendentes" && t.status !== "pendente") return false;
      if (activeFilter === "receitas" && t.kind !== "receita") return false;
      if (activeFilter === "despesas" && t.kind === "receita") return false;
      if (!q) return true;
      const haystack = [
        t.description ?? "", t.category ?? "", t.bank ?? "",
        String(t.amount), formatBRL(Number(t.amount)),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [list, search, competenceFilter, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITENS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITENS_PER_PAGE, page * ITENS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, competenceFilter, activeFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    let receitas = 0, despesas = 0;
    for (const t of filtered) {
      if (t.kind === "receita") receitas += Number(t.amount);
      else despesas += Number(t.amount);
    }
    return { total, receitas, despesas };
  }, [filtered]);

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
      date, payment, payment === "Crédito" ? selectedCard : null,
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

  const selectedCard = cards.find((c) => c.id === cardId) ?? null;
  const compPreview = computeCompetenceMonth(
    date, payment, payment === "Crédito" ? selectedCard : null,
    closedMonths,
  );
  const compBase = computeCompetenceMonth(
    date, payment, payment === "Crédito" ? selectedCard : null,
    [],
  );
  const compShifted = compPreview !== compBase;
  const dueDate = payment === "Crédito" && selectedCard?.due_day
    ? computeDueDate(compPreview, selectedCard.due_day) : null;

  return (
    <>
      <style id="lc-style">{`
        :root {
          --bg-global: #F8F9FA;
          --white: #FFFFFF;
          --green-primary: #0F6E36;
          --green-light: #EBF5EE;
          --green-text: #1b8549;
          --coral-light: #FDF2EE;
          --coral-text: #E0533C;
          --orange-light: #FFF4EC;
          --orange-text: #E67E22;
          --text-dark: #1A1D20;
          --text-muted: #70777F;
          --border-color: #E9ECEF;
          --radius-lg: 16px;
          --radius-md: 10px;
          --shadow: 0px 4px 20px rgba(0, 0, 0, 0.02);
        }

        .lc { font-family: 'Inter', sans-serif; color: var(--text-dark); }
        .lc h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
        .lc .subtitle { color: var(--text-muted); font-size: 14px; }

        .lc .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .lc .kpi-card {
          background: var(--white); border-radius: var(--radius-lg); padding: 24px;
          display: flex; align-items: center; gap: 20px;
          box-shadow: var(--shadow); border: 1px solid rgba(0,0,0,0.01);
        }
        .lc .kpi-icon-box {
          width: 54px; height: 54px; border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
        }
        .lc .kpi-card:nth-child(1) .kpi-icon-box { background-color: var(--green-light); color: var(--green-primary); }
        .lc .kpi-card:nth-child(2) .kpi-icon-box { background-color: #F4FBF7; color: var(--green-text); }
        .lc .kpi-card:nth-child(3) .kpi-icon-box { background-color: var(--coral-light); color: var(--coral-text); }
        .lc .kpi-info span { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .lc .kpi-info h2 { font-size: 26px; font-weight: 700; margin: 2px 0; }
        .lc .kpi-info h2.positive { color: var(--green-text); }
        .lc .kpi-info h2.negative { color: var(--coral-text); }
        .lc .kpi-info p { font-size: 12px; color: var(--text-muted); }

        .lc .filter-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 12px; flex-wrap: wrap; }
        .lc .filter-chips { display: flex; gap: 10px; flex-wrap: wrap; }
        .lc .chip {
          background: var(--white); border: 1px solid var(--border-color);
          padding: 8px 18px; border-radius: 20px; font-size: 13px;
          font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .lc .chip.active-green { background: var(--green-primary); color: var(--white); border-color: var(--green-primary); }
        .lc .chip .dot { display: inline-block; width: 6px; height: 6px; background: var(--orange-text); border-radius: 50%; margin-left: 6px; vertical-align: middle; }
        .lc .search-input {
          flex: 1; min-width: 180px; padding: 10px 14px; border: 1px solid var(--border-color);
          border-radius: var(--radius-md); font-size: 13px; font-family: inherit; outline: none;
        }

        .lc .form-card {
          background: var(--white); border-radius: var(--radius-lg); padding: 24px;
          box-shadow: var(--shadow); margin-bottom: 35px; border: 1px solid rgba(0,0,0,0.01);
        }
        .lc .form-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .lc .form-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .lc .form-group { display: flex; flex-direction: column; gap: 8px; }
        .lc .form-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
        .lc .type-selectors { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .lc .type-btn {
          background: var(--white); border: 1px solid var(--border-color); padding: 12px;
          border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;
        }
        .lc .type-btn.active {
          border: 1px solid var(--green-primary); color: var(--green-primary);
          background-color: var(--green-light);
        }
        .lc .form-control {
          width: 100%; padding: 12px 14px; border: 1px solid var(--border-color);
          border-radius: var(--radius-md); font-size: 14px; background-color: var(--white);
          outline: none; font-family: inherit;
        }
        .lc .form-control.value-input {
          background-color: #F4FBF7; border-color: transparent;
          color: var(--green-text); font-weight: 700; font-size: 18px; text-align: right;
        }
        .lc .form-row-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .lc .form-row-installments { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .lc .description-block { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
        .lc .btn-submit {
          background-color: var(--green-primary); color: var(--white); border: none;
          padding: 14px 24px; border-radius: var(--radius-md); font-size: 14px;
          font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
          white-space: nowrap; height: 45px;
        }

        .lc .history-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .lc .history-section-header h3 { font-size: 16px; font-weight: 600; }
        .lc .filter-right { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .lc .filter-right select { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; font-family: inherit; background: var(--white); outline: none; cursor: pointer; }

        .lc .history-list { display: flex; flex-direction: column; gap: 8px; }
        .lc .history-item {
          background: var(--white); border-radius: var(--radius-md); padding: 14px 20px;
          display: grid; grid-template-columns: 2.5fr 1.5fr 1.5fr 1fr 1.5fr 40px;
          align-items: center; box-shadow: var(--shadow); border: 1px solid rgba(0,0,0,0.01);
          gap: 8px;
        }
        .lc .item-main { display: flex; align-items: center; gap: 14px; overflow: hidden; }
        .lc .item-icon {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .lc .item-title { overflow: hidden; }
        .lc .item-title h4 { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lc .item-title p { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lc .item-meta { font-size: 13px; font-weight: 500; }
        .lc .item-meta span { display: block; font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .lc .badge-status {
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
          text-align: center; width: fit-content; border: none; cursor: pointer; transition: all 0.15s;
        }
        .lc .badge-status.pago { background-color: var(--green-light); color: var(--green-primary); }
        .lc .badge-status.pendente { background-color: var(--orange-light); color: var(--orange-text); }
        .lc .item-value { font-size: 15px; font-weight: 700; text-align: right; padding-right: 10px; }
        .lc .item-value.positive { color: var(--green-text); }
        .lc .item-value.negative { color: var(--coral-text); }
        .lc .item-actions { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .lc .btn-icon {
          background: none; border: none; cursor: pointer; font-size: 16px;
          padding: 4px; border-radius: 4px; transition: all 0.15s; line-height: 1;
        }
        .lc .btn-icon:hover { background: rgba(0,0,0,0.05); }
        .lc .btn-icon.danger { color: var(--coral-text); }

        .lc .comp-hint { font-size: 11px; margin-top: 4px; }
        .lc .comp-hint.shifted { color: var(--orange-text); }
        .lc .comp-hint.normal { color: var(--text-muted); }

        .lc .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 14px; }
        .lc .loading-state { text-align: center; padding: 20px; color: var(--text-muted); }

        .lc .pagination { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; flex-wrap: wrap; }
        .lc .page-btn {
          min-width: 36px; height: 36px; border: 1px solid var(--border-color);
          border-radius: var(--radius-sm); background: var(--white); color: var(--text-dark);
          font-size: 13px; font-weight: 500; cursor: pointer; display: flex;
          align-items: center; justify-content: center; transition: all 0.15s;
        }
        .lc .page-btn:hover { background: var(--green-light); border-color: var(--green-primary); }
        .lc .page-btn.active { background: var(--green-primary); color: var(--white); border-color: var(--green-primary); }
        .lc .page-btn:disabled { opacity: 0.4; cursor: default; }
        .lc .page-info { font-size: 13px; color: var(--text-muted); margin: 0 8px; }

        .lc .inst-badge { font-size: 11px; color: var(--text-muted); display: block; }

        @media (max-width: 1100px) {
          .lc .kpi-grid, .lc .form-grid, .lc .form-row-bottom, .lc .form-row-installments { grid-template-columns: 1fr; }
          .lc .history-item { grid-template-columns: 1fr 1fr; gap: 10px; }
          .lc .item-value, .lc .item-actions { text-align: left; justify-content: flex-start; }
        }
      `}</style>

      <div className="lc">
        <div className="flex justify-between items-start mb-6" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>Lançamentos</h1>
            <p className="subtitle">Registre e acompanhe todas as suas movimentações financeiras.</p>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {formatCompetenceBR(compPreview)}
            </span>
            <button className="date-picker" style={{
              background: "var(--white)", border: "1px solid var(--border-color)",
              padding: "10px 16px", borderRadius: "var(--radius-md)",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}>📅 Maio / 2026 ▾</button>
            <div style={{ fontSize: 20, cursor: "pointer" }}>🔔</div>
          </div>
        </div>

        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-box">📊</div>
            <div className="kpi-info">
              <span>Total de lançamentos</span>
              <h2>{kpis.total}</h2>
              <p>No filtro atual</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-box">↑</div>
            <div className="kpi-info">
              <span>Receitas</span>
              <h2 className="positive">+{formatBRL(kpis.receitas)}</h2>
              <p>No filtro atual</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-box">↓</div>
            <div className="kpi-info">
              <span>Despesas</span>
              <h2 className="negative">-{formatBRL(kpis.despesas)}</h2>
              <p>No filtro atual</p>
            </div>
          </div>
        </section>

        <section className="filter-row">
          <div className="filter-chips">
            {[
              { key: "todos", label: "Todos" },
              { key: "hoje", label: "Hoje" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mês" },
              { key: "pendentes", label: "Pendentes", dot: true },
              { key: "receitas", label: "Receitas" },
              { key: "despesas", label: "Despesas" },
            ].map((f) => (
              <button
                key={f.key}
                className={`chip ${activeFilter === f.key ? "active-green" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
                {f.dot && <span className="dot"></span>}
              </button>
            ))}
          </div>
          <div className="filter-right">
            <select value={competenceFilter} onChange={(e) => setCompetenceFilter(e.target.value)}>
              <option value="all">Todas competências</option>
              {competenceOptions.map((c) => (
                <option key={c} value={c}>{formatCompetenceBR(c)}</option>
              ))}
            </select>
            <input
              className="search-input"
              placeholder="Buscar lançamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        <section className="form-card">
          <h3><span>➕</span> Novo lançamento</h3>
          <form onSubmit={add}>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo</label>
                <div className="type-selectors">
                  {TYPE_BUTTONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`type-btn ${kind === t.value ? "active" : ""}`}
                      onClick={() => { setKind(t.value); setCategory(""); }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nova categoria</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Digite e pressione Enter"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-bottom">
              <div className="form-group">
                <label>Data</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
                <div className={`comp-hint ${compShifted ? "shifted" : "normal"}`}>
                  Competência: {formatCompetenceBR(compPreview)}
                  {compShifted ? " (mês anterior fechado)" : ""}
                </div>
                {dueDate && (
                  <div className="comp-hint normal">
                    Vencimento: {formatDateBR(dueDate)}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input
                  type="text"
                  className="form-control value-input"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Titular</label>
                <select className="form-control" value={titular} onChange={(e) => setTitular(e.target.value)}>
                  <option value="">—</option>
                  {TITULARES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-bottom">
              <div className="form-group">
                <label>Forma de pagamento</label>
                <select className="form-control" value={payment} onChange={(e) => { setPayment(e.target.value); setBank(""); setCardId(""); }}>
                  <option value="">—</option>
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {payment === "Dinheiro" ? (
                <div className="form-group">
                  <label>Banco</label>
                  <input className="form-control" disabled placeholder="—" />
                </div>
              ) : isCard ? (
                <div className="form-group">
                  <label>Cartão</label>
                  <select className="form-control" value={cardId} onChange={(e) => setCardId(e.target.value)}>
                    <option value="">Selecione um cartão</option>
                    {filteredCards.length === 0 ? (
                      <option disabled>Cadastre cartões na aba Cartões</option>
                    ) : filteredCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.bank})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Banco</label>
                  <select className="form-control" value={bank} onChange={(e) => setBank(e.target.value)}>
                    <option value="">—</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value as "pendente" | "pago")}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago / Liquidado</option>
                </select>
              </div>
            </div>

            {showInstallments && (
              <div className="form-row-installments">
                <div className="form-group">
                  <label>Parcela inicial</label>
                  <input type="number" min={1} className="form-control" value={instNo} onChange={(e) => setInstNo(e.target.value)} placeholder="1" />
                </div>
                <div className="form-group">
                  <label>Total de parcelas</label>
                  <input type="number" min={1} className="form-control" value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
                </div>
              </div>
            )}

            <div className="form-group description-block">
              <div style={{ flex: 1 }}>
                <label>Descrição</label>
                <input type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
              </div>
              <button type="submit" className="btn-submit">＋ Adicionar lançamento</button>
            </div>
          </form>
        </section>

        <section className="history-section-header">
          <h3>Histórico de lançamentos</h3>
          <div className="filter-right">
            <select>
              <option>Mais recentes ▾</option>
            </select>
          </div>
        </section>

        <section className="history-list">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">Nenhum lançamento encontrado.</div>
          ) : paginated.map((t) => {
            const isPago = t.status === "pago";
            const isReceita = t.kind === "receita";
            const cardLabel = t.card_id ? cardNameById[t.card_id] : t.bank;
            const icon = iconForCategory(t.category);
            const kindLabel = KINDS.find((x) => x.value === t.kind)?.label ?? t.kind;

            return (
              <div className="history-item" key={t.id}>
                <div className="item-main">
                  <div className="item-icon" style={{
                    background: isReceita ? "var(--green-light)" : isPago ? "var(--green-light)" : "var(--orange-light)",
                    color: isReceita ? "var(--green-primary)" : isPago ? "var(--green-primary)" : "var(--orange-text)",
                  }}>{icon}</div>
                  <div className="item-title">
                    <h4>{t.category}</h4>
                    <p>{t.description || kindLabel}{t.installment_no && t.installments_total ? ` (${t.installment_no}/${t.installments_total})` : ""}</p>
                  </div>
                </div>
                <div className="item-meta">
                  {t.payment_method ?? "—"}
                  <span>{cardLabel ?? "—"}</span>
                </div>
                <div className="item-meta">
                  {formatDateBR(t.occurred_on)}
                  <span>{formatCompetenceBR(t.competence_month)}</span>
                </div>
                <div>
                  <button
                    className={`badge-status ${isPago ? "pago" : "pendente"}`}
                    onClick={() => toggleStatus(t)}
                    title="Clique para alternar"
                  >
                    ● {isPago ? "Pago" : "Pendente"}
                  </button>
                </div>
                <div className={`item-value ${isReceita ? "positive" : "negative"}`}>
                  {isReceita ? "" : "-"}{formatBRL(Number(t.amount))}
                </div>
                <div className="item-actions">
                  <button className="btn-icon danger" onClick={() => remove(t.id)} title="Remover">✕</button>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length > ITENS_PER_PAGE && (
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
              {(() => {
                const pages: (number | string)[] = [];
                const delta = 1;
                const left = Math.max(2, page - delta);
                const right = Math.min(totalPages - 1, page + delta);
                pages.push(1);
                if (left > 2) pages.push("…");
                for (let i = left; i <= right; i++) pages.push(i);
                if (right < totalPages - 1) pages.push("…");
                if (totalPages > 1) pages.push(totalPages);
                return pages.map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`ellipsis-${i}`} className="page-info">{p}</span>
                  ) : (
                    <button key={p} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                  )
                );
              })()}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
              <span className="page-info">{filtered.length} itens</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

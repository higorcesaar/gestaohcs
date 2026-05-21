import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatBRL, formatDateBR, KINDS,
} from "@/lib/finance-constants";
import { useTitular, applyTitular } from "@/hooks/use-titular";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Tx {
  id: string; occurred_on: string; competence_month: string;
  kind: string; category: string; amount: number;
  description: string | null; bank: string | null;
  payment_method: string | null; titular: string | null;
  installment_no: number | null; installments_total: number | null;
  card_id: string | null; status: string;
}

interface CardRow {
  id: string; name: string; bank: string; titular: string | null;
  closing_day: number; due_day: number; credit_limit?: number;
}

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const BANK_COLORS: Record<string, string> = {
  NUBANK: "#820AD1", INTER: "#FF7A00", XP: "#000000",
  NEON: "#00C857", BRADESCO: "#CC0000", CAIXA: "#005CA9",
  "MERCADO PAGO": "#00B5E2", SANTANDER: "#FF0000",
  "BANCO DO BRASIL": "#FABE00",
};

function Dashboard() {
  const now = new Date();
  const { titular } = useTitular();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tx, setTx] = useState<Tx[]>([]);
  const [prevTx, setPrevTx] = useState<Tx[]>([]);
  const [nextTx, setNextTx] = useState<Tx[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 1).toISOString().slice(0, 10);
  const prevStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const endNext = new Date(year, month + 2, 1).toISOString().slice(0, 10);
  const monthLabel = MESES_PT[month];

  useEffect(() => {
    setLoading(true);
    const loadTx = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", start).lt("competence_month", end)
      .order("occurred_on", { ascending: false });
    applyTitular(loadTx, titular).then(({ data }) => setTx((data ?? []) as Tx[]));

    const loadPrev = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", prevStart).lt("competence_month", start);
    applyTitular(loadPrev, titular).then(({ data }) => setPrevTx((data ?? []) as Tx[]));

    const loadNext = supabase.from("transactions")
      .select("id, occurred_on, competence_month, kind, category, amount, description, bank, payment_method, titular, installment_no, installments_total, card_id, status")
      .gte("competence_month", end).lt("competence_month", endNext);
    applyTitular(loadNext, titular).then(({ data }) => setNextTx((data ?? []) as Tx[]));

    supabase.from("cards").select("*").order("name")
      .then(({ data, error }) => { if (!error) setCards((data ?? []) as CardRow[]); setLoading(false); });
  }, [year, month, titular]);

  const visibleCards = useMemo(
    () => cards.filter((c) => titular === "all" || !c.titular || c.titular === titular),
    [cards, titular],
  );

  const sum = (list: Tx[], kind: string) =>
    list.filter((t) => t.kind === kind).reduce((s, t) => s + Number(t.amount), 0);

  const receitas = sum(tx, "receita");
  const fixos = sum(tx, "fixo");
  const variaveis = sum(tx, "variavel");
  const parcelas = sum(tx, "parcelamento");
  const totalDespesas = fixos + variaveis + parcelas;
  const totalPago = tx.filter((t) => t.kind !== "receita" && t.status === "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalPendente = tx.filter((t) => t.kind !== "receita" && t.status !== "pago")
    .reduce((s, t) => s + Number(t.amount), 0);
  const saldoConta = receitas - totalPago;
  const resultadoPrevisto = receitas - totalDespesas;
  const qtdPendentes = tx.filter((t) => t.kind !== "receita" && t.status !== "pago").length;

  const prevReceitas = sum(prevTx, "receita");
  const prevDespesas = prevTx.filter((t) => t.kind !== "receita")
    .reduce((s, t) => s + Number(t.amount), 0);
  const diffSaldoPct = (prevReceitas - prevDespesas) !== 0
    ? ((saldoConta - (prevReceitas - prevDespesas)) / Math.abs(prevReceitas - prevDespesas) * 100).toFixed(0)
    : "0";
  const diffReceitasPct = prevReceitas > 0 ? ((receitas - prevReceitas) / prevReceitas * 100).toFixed(0) : "0";
  const diffDespesasPct = prevDespesas > 0 ? ((totalDespesas - prevDespesas) / prevDespesas * 100).toFixed(0) : "0";

  const cardTotals = useMemo(() => {
    return visibleCards.map((c) => {
      const items = tx.filter((t) => t.payment_method === "Crédito" && t.card_id === c.id);
      const total = items.reduce((s, t) => s + Number(t.amount), 0);
      return { card: c, total, items };
    });
  }, [visibleCards, tx]);

  const recent = tx.slice(0, 5);

  const catExpenses = useMemo(() => {
    const map = new Map<string, number>();
    tx.filter((t) => t.kind !== "receita").forEach((t) => {
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [tx]);

  const catTotal = catExpenses.reduce((s, c) => s + c.value, 0);
  const nextOutflow = nextTx.filter((t) => t.kind !== "receita")
    .reduce((s, t) => s + Number(t.amount), 0);
  const cardTotalSum = cardTotals.reduce((s, ct) => s + ct.total, 0);

  return (
    <>
      <style id="db-style">{`
        .db {
          --bg-body: #F4F6F4;
          --white: #FFFFFF;
          --primary: #2D6A4F;
          --primary-light: #D8E2DC;
          --success: #1B4332;
          --success-bg: #E8F5EE;
          --danger: #D62828;
          --danger-bg: #FDF0ED;
          --warning: #F77F00;
          --text-main: #1F2937;
          --text-muted: #6B7280;
          --border: #E5E7EB;
          --radius-md: 12px;
          --radius-sm: 8px;
          font-family: 'Inter', sans-serif;
          color: var(--text-main);
        }

        .db h2 { font-size: 28px; font-weight: 700; }
        .db .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .db .page-title p { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
        .db .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .db .btn-success {
          background-color: var(--primary); color: white; border: none;
          padding: 10px 16px; border-radius: var(--radius-sm); font-size: 13px;
          font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
        }
        .db .select-filter {
          padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: var(--white); font-size: 13px; outline: none; font-family: inherit;
        }

        .db .card-highlight {
          background: var(--white); border: 1px solid var(--primary-light);
          border-radius: var(--radius-md); padding: 24px;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; gap: 24px; flex-wrap: wrap;
        }
        .db .highlight-col { display: flex; flex-direction: column; gap: 8px; }
        .db .highlight-col span { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .db .saldo-value { font-size: 32px; font-weight: 700; color: var(--primary); }
        .db .badge-green { background: var(--success-bg); color: var(--primary); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
        .db .text-danger { color: var(--danger); }
        .db .text-success { color: var(--primary); }
        .db .btn-outline {
          background: transparent; border: 1px solid var(--border);
          padding: 8px 16px; border-radius: var(--radius-sm);
          font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
        }

        .db .metrics-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
        .db .metric-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 20px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .db .metric-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
        .db .icon-box {
          width: 36px; height: 36px; background: var(--primary); color: white;
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 14px; flex-shrink: 0;
        }
        .db .metric-info h4 { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; }
        .db .metric-info h3 { font-size: 20px; font-weight: 700; }
        .db .metric-info .trend { font-size: 11px; margin-top: 4px; font-weight: 600; }
        .db .card-footer-list { list-style: none; font-size: 11px; color: var(--text-muted); margin-top: 10px; }
        .db .card-footer-list li { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .db .fake-chart-line { height: 30px; background: linear-gradient(to top, var(--success-bg), transparent); border-bottom: 2px solid var(--primary); border-radius: 0 0 8px 8px; margin: -20px; margin-top: 10px; }
        .db .fake-chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 30px; margin-top: 10px; }
        .db .bar { background: var(--warning); width: 8px; border-radius: 2px; }
        .db .fake-chart-donut { width: 40px; height: 40px; border: 6px solid var(--warning); border-radius: 50%; border-top-color: var(--primary-light); margin: 0 auto; margin-top: 10px; }

        .db .middle-grid { display: grid; grid-template-columns: 2fr 1.2fr; gap: 24px; margin-bottom: 24px; }
        .db .panel { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; }
        .db .panel-title { font-size: 15px; font-weight: 600; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }

        .db .fluxo-container { display: flex; align-items: stretch; justify-content: space-between; padding: 20px 0; gap: 16px; flex-wrap: wrap; }
        .db .fluxo-box { border: 1px solid var(--border); border-radius: 8px; padding: 12px; text-align: center; background: white; width: 130px; }
        .db .fluxo-box h5 { font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; }
        .db .fluxo-box p { font-size: 14px; font-weight: 700; }
        .db .fluxo-col-right { display: flex; flex-direction: column; gap: 12px; min-width: 180px; }
        .db .fluxo-item { display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 8px; background: #F9FAFB; border-radius: 6px; }
        .db .fluxo-item strong { color: var(--text-main); font-weight: 600; }
        .db .fluxo-item .perc { color: var(--danger); font-weight: 700; }

        .db .alerts-list { display: flex; flex-direction: column; gap: 16px; }
        .db .alert-item { display: flex; gap: 12px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .db .alert-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .db .alert-info h4 { font-size: 13px; font-weight: 600; }
        .db .alert-info p { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .db .alert-chevron { margin-left: auto; color: var(--border); font-size: 12px; }
        .db .link-all { text-align: center; margin-top: 16px; }
        .db .link-all a { font-size: 12px; color: var(--primary); font-weight: 600; text-decoration: none; }

        .db .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .db .list-table { width: 100%; border-collapse: collapse; }
        .db .list-table tr { border-bottom: 1px solid var(--border); }
        .db .list-table td { padding: 12px 0; font-size: 12px; vertical-align: middle; }
        .db .list-table td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }

        .db .progress-item { margin-bottom: 16px; }
        .db .progress-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
        .db .progress-bar-bg { height: 6px; background: var(--border); border-radius: 4px; width: 100%; overflow: hidden; }
        .db .progress-fill { height: 100%; background: var(--primary); border-radius: 4px; }
        .db .total-row { display: flex; justify-content: space-between; margin-top: 24px; font-weight: 700; font-size: 14px; }

        .db .card-summary-item { margin-bottom: 20px; }
        .db .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
        .db .card-brand { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .db .card-logo { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; flex-shrink: 0; }
        .db .card-logo.nu { background: #820AD1; }
        .db .card-logo.inter { background: #FF7A00; }
        .db .card-value { text-align: right; font-size: 13px; font-weight: 600; white-space: nowrap; }
        .db .card-limit { font-size: 11px; color: var(--text-muted); font-weight: 400; display: block; }
        .db .card-progress { display: flex; align-items: center; gap: 8px; }
        .db .card-progress .progress-bar-bg { flex: 1; }

        .db .loading-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
        .db .empty-text { font-size: 12px; color: var(--text-muted); padding: 12px 0; }

        @media (max-width: 1100px) {
          .db .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .db .middle-grid { grid-template-columns: 1fr; }
          .db .bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .db .metrics-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="db">
        <header className="header">
          <div className="page-title">
            <h2>Dashboard</h2>
            <p>{monthLabel} de {year}</p>
          </div>
          <div className="header-actions">
            <select className="select-filter" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MESES_PT.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="select-filter" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">Carregando...</div>
        ) : (
          <>
            <section className="card-highlight">
              <div className="highlight-col">
                <span>Saldo atual 👁️</span>
                <div className="saldo-value">{formatBRL(saldoConta)}</div>
                <div>
                  <span className="badge-green">{Number(diffSaldoPct) >= 0 ? "↑" : "↓"} {Math.abs(Number(diffSaldoPct))}%</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>em relação ao mês anterior</span>
                </div>
              </div>
              <div className="highlight-col" style={{ borderLeft: "1px solid var(--border)", paddingLeft: 32 }}>
                <span>Visão geral do mês de {monthLabel}</span>
                <p style={{ fontSize: 13 }}>
                  Receitas <strong className="text-success">{formatBRL(receitas)}</strong> — Despesas <strong className="text-danger">{formatBRL(totalDespesas)}</strong>
                </p>
                <span style={{ marginTop: 12 }}>Resultado previsto</span>
                <p style={{ fontSize: 20, fontWeight: 700 }} className="text-danger">
                  {resultadoPrevisto >= 0 ? "" : "-"}{formatBRL(Math.abs(resultadoPrevisto))}
                </p>
              </div>
              <button className="btn-outline">Ver detalhes completos ❯</button>
            </section>

            <section className="metrics-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <div className="icon-box" style={{ background: "#1B4332" }}>↗</div>
                  <div className="metric-info">
                    <h4>Receitas</h4>
                    <h3>{formatBRL(receitas)}</h3>
                    <p className="trend text-success">↑ {Math.abs(Number(diffReceitasPct))}% vs mês ant.</p>
                  </div>
                </div>
                <div className="fake-chart-line"></div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <div className="icon-box" style={{ background: "#2D6A4F" }}>💳</div>
                  <div className="metric-info">
                    <h4>Despesas Fixas</h4>
                    <h3>{formatBRL(fixos)}</h3>
                    <p className="trend text-danger">↑ {Math.abs(Number(diffDespesasPct))}% vs mês ant.</p>
                  </div>
                </div>
                <div className="fake-chart-bars">
                  {[40, 60, 30, 80, 50, 100, 40, 60].map((h, i) => (
                    <div key={i} className="bar" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <div className="icon-box" style={{ background: "#40916C" }}>🛒</div>
                  <div className="metric-info">
                    <h4>Despesas Variáveis</h4>
                    <h3>{formatBRL(variaveis)}</h3>
                    <p className="trend text-danger">↑ {Math.abs(Number(diffDespesasPct))}% vs mês ant.</p>
                  </div>
                </div>
                <div className="fake-chart-donut"></div>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <div className="icon-box" style={{ background: "#52B788" }}>📄</div>
                  <div className="metric-info">
                    <h4>Parcelamentos</h4>
                    <h3>{formatBRL(parcelas)}</h3>
                    <p className="trend text-danger">↑ {Math.abs(Number(diffDespesasPct))}% vs mês ant.</p>
                  </div>
                </div>
                <ul className="card-footer-list">
                  <li><span>Este mês</span> <strong>{formatBRL(parcelas)}</strong></li>
                  {(() => {
                    const nextParc = nextTx.filter((t) => t.kind === "parcelamento")
                      .reduce((s, t) => s + Number(t.amount), 0);
                    return <li><span>Próximos 30 dias</span> <strong>{formatBRL(nextParc)}</strong></li>;
                  })()}
                </ul>
              </div>
              <div className="metric-card">
                <div className="metric-header">
                  <div className="icon-box" style={{ background: "#1B4332" }}>📅</div>
                  <div className="metric-info">
                    <h4>A pagar (total)</h4>
                    <h3>{formatBRL(totalPendente)}</h3>
                    <p style={{ fontSize: 12, marginTop: 4, color: "var(--text-muted)" }}>{qtdPendentes} contas</p>
                  </div>
                </div>
                {qtdPendentes > 0 && <p className="text-danger" style={{ fontSize: 12, fontWeight: 600, marginTop: 16 }}>Pendentes de pagamento</p>}
              </div>
            </section>

            <section className="middle-grid">
              <div className="panel">
                <div className="panel-title">Fluxo financeiro do mês</div>
                <div className="fluxo-container">
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div className="fluxo-box" style={{ borderColor: "var(--primary)" }}>
                      <h5>Receitas</h5>
                      <p className="text-success">{formatBRL(receitas)}</p>
                    </div>
                    <div style={{ marginTop: 40 }}>
                      <h5 style={{ fontSize: 11, color: "var(--text-muted)" }}>Déficit do mês</h5>
                      <p className="text-danger" style={{ fontSize: 18, fontWeight: 700 }}>
                        {resultadoPrevisto >= 0 ? "" : "-"}{formatBRL(Math.abs(resultadoPrevisto))}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="fluxo-box" style={{ borderColor: "var(--danger)" }}>
                      <h5>Total de Despesas</h5>
                      <p className="text-danger">{formatBRL(totalDespesas)}</p>
                    </div>
                  </div>
                  <div className="fluxo-col-right">
                    {[
                      { name: "Despesas Fixas", value: fixos },
                      { name: "Despesas Variáveis", value: variaveis },
                      { name: "Parcelamentos", value: parcelas },
                      { name: "Outros", value: Math.max(0, totalDespesas - fixos - variaveis - parcelas) },
                    ].map((d) => {
                      const pct = totalDespesas > 0 ? ((d.value / totalDespesas) * 100).toFixed(0) : "0";
                      return (
                        <div className="fluxo-item" key={d.name}>
                          <div>
                            <strong className="text-success">{d.name}</strong><br />{formatBRL(d.value)}
                          </div>
                          <span className="perc">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">🔔 Alertas e avisos</div>
                <div className="alerts-list">
                  {cardTotals.filter((ct) => ct.total > 0).length > 0 ? (
                    cardTotals.filter((ct) => ct.total > 0).slice(0, 2).map((ct) => {
                      const pendentes = ct.items.filter((i) => i.status !== "pago").length;
                      return (
                        <div className="alert-item" key={ct.card.id}>
                          <div className="alert-icon" style={{ background: "#FFF3E0", color: "#E65100" }}>💳</div>
                          <div className="alert-info">
                            <h4>{ct.card.name}</h4>
                            <p>{pendentes > 0 ? `${pendentes} pendente(s)` : "Fatura aberta"} • {formatBRL(ct.total)}</p>
                          </div>
                          <div className="alert-chevron">❯</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="alert-item">
                      <div className="alert-icon" style={{ background: "var(--success-bg)", color: "var(--primary)" }}>✅</div>
                      <div className="alert-info">
                        <h4>Nenhum alerta</h4>
                        <p>Todas as contas em dia</p>
                      </div>
                    </div>
                  )}
                  {qtdPendentes > 0 && (
                    <div className="alert-item">
                      <div className="alert-icon" style={{ background: "#FFEBEE", color: "#C62828" }}>⚠️</div>
                      <div className="alert-info">
                        <h4>{qtdPendentes} pendência(s)</h4>
                        <p>Total de {formatBRL(totalPendente)} a pagar</p>
                      </div>
                      <div className="alert-chevron">❯</div>
                    </div>
                  )}
                  {nextOutflow > 0 && (
                    <div className="alert-item">
                      <div className="alert-icon" style={{ background: "#FFF8E1", color: "#F57F17" }}>📈</div>
                      <div className="alert-info">
                        <h4>Próximo mês</h4>
                        <p>{formatBRL(nextOutflow)} em despesas projetadas</p>
                      </div>
                      <div className="alert-chevron">❯</div>
                    </div>
                  )}
                </div>
                <div className="link-all"><a href="#">Ver todos os alertas</a></div>
              </div>
            </section>

            <section className="bottom-grid">
              <div className="panel">
                <div className="panel-title">
                  Lançamentos recentes
                  <button className="btn-outline" style={{ padding: "4px 8px", fontSize: 11 }}>Ver todos</button>
                </div>
                {recent.length === 0 ? (
                  <div className="empty-text">Nenhum lançamento neste mês.</div>
                ) : (
                  <table className="list-table">
                    <tbody>
                      {recent.map((t) => {
                        const isReceita = t.kind === "receita";
                        const kindInfo = KINDS.find((k) => k.value === t.kind);
                        const icon = isReceita ? "💵" : t.kind === "fixo" ? "📋" : "🛒";
                        return (
                          <tr key={t.id}>
                            <td style={{ width: 30, textAlign: "center" }}>{icon}</td>
                            <td>{formatDateBR(t.occurred_on)}<br /><strong>{t.description || t.category}</strong></td>
                            <td style={{ color: "var(--text-muted)" }}>{kindInfo?.label ?? t.kind}</td>
                            <td className={isReceita ? "text-success" : "text-danger"}>
                              {isReceita ? "+ " : "- "}{formatBRL(Number(t.amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="panel">
                <div className="panel-title">
                  Gastos por categoria
                  <button className="btn-outline" style={{ padding: "4px 8px", fontSize: 11 }}>Ver relatório</button>
                </div>
                {catExpenses.length === 0 ? (
                  <div className="empty-text">Nenhum gasto neste mês.</div>
                ) : (
                  catExpenses.slice(0, 5).map((c) => {
                    const pct = catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(0) : "0";
                    const icons: Record<string, string> = { moradia: "🏠", crédito: "💳", transporte: "🚗", alimenta: "🛒", saúde: "⚕️" };
                    const icon = Object.entries(icons).find(([k]) => c.name.toLowerCase().includes(k))?.[1] ?? "📄";
                    return (
                      <div className="progress-item" key={c.name}>
                        <div className="progress-header">
                          <span>{icon} {c.name}</span>
                          <span>{formatBRL(c.value)} ({pct}%)</span>
                        </div>
                        <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${pct}%` }}></div></div>
                      </div>
                    );
                  })
                )}
                <div className="total-row"><span>Total</span><span>{formatBRL(catTotal)}</span></div>
              </div>

              <div className="panel">
                <div className="panel-title">
                  Resumo dos cartões
                  <button className="btn-outline" style={{ padding: "4px 8px", fontSize: 11 }}>Ver todos</button>
                </div>
                {cardTotals.length === 0 ? (
                  <div className="empty-text">Nenhum cartão cadastrado.</div>
                ) : cardTotals.map((ct) => {
                  const bankKey = ct.card.bank.toUpperCase();
                  const brandColor = BANK_COLORS[bankKey] || "#666";
                  const logoClass = bankKey === "NUBANK" ? "nu" : bankKey === "INTER" ? "inter" : "";
                  const limit = ct.card.credit_limit ?? 0;
                  const usedPct = limit > 0 ? Math.min(100, (ct.total / limit) * 100).toFixed(0) : "0";
                  return (
                    <div className="card-summary-item" key={ct.card.id}>
                      <div className="card-header">
                        <div className="card-brand">
                          <div className={`card-logo ${logoClass}`} style={!logoClass ? { backgroundColor: brandColor } : {}}>
                            {ct.card.bank.slice(0, 2).toLowerCase()}
                          </div>
                          {ct.card.name}
                        </div>
                        <div className="card-value">
                          {formatBRL(ct.total)}
                          {limit > 0 && <span className="card-limit">Limite: {formatBRL(limit)}</span>}
                          {limit === 0 && <span className="card-limit">Sem limite registrado</span>}
                        </div>
                      </div>
                      {limit > 0 && (
                        <div className="card-progress">
                          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${usedPct}%`, background: brandColor }}></div></div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{usedPct}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {cardTotals.length > 0 && (
                  <div className="total-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 24 }}>
                    <span>Total utilizado</span>
                    <span className="text-success">{formatBRL(cardTotalSum)}</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: Lancamentos,
});

const styleId = "lancamentos-style";

function Lancamentos() {
  const [activeFilter, setActiveFilter] = useState("todos");

  const filters = [
    { key: "todos", label: "Todos" },
    { key: "hoje", label: "Hoje" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês", active: true },
    { key: "pendentes", label: "Pendentes", dot: true },
    { key: "receitas", label: "Receitas" },
    { key: "despesas", label: "Despesas" },
  ];

  const history = [
    {
      icon: "💻",
      title: "Freelancer",
      desc: "Projeto de design",
      meta: "PIX",
      bank: "Nubank",
      date: "01/06/2026",
      dateLabel: "Hoje",
      badge: "pago",
      value: "R$ 106,32",
      positive: true,
    },
    {
      icon: "🚗",
      title: "Uber",
      desc: "Ida para igreja",
      meta: "Crédito",
      bank: "Nubank",
      date: "19/05/2026",
      dateLabel: "Ontem",
      badge: "pendente",
      value: "-R$ 30,00",
      positive: false,
    },
    {
      icon: "🍔",
      title: "McDonald's",
      desc: "Almoço",
      meta: "Débito",
      bank: "Nubank",
      date: "18/05/2026",
      dateLabel: "Segunda",
      badge: "pago",
      value: "-R$ 25,90",
      positive: false,
    },
    {
      icon: "⌨️",
      title: "Venda de equipamento",
      desc: "Teclado mecânico",
      meta: "PIX",
      bank: "Inter",
      date: "17/05/2026",
      dateLabel: "Sábado",
      badge: "pago",
      value: "R$ 75,00",
      positive: true,
    },
  ];

  return (
    <>
      <style id={styleId}>{`
        :root {
          --bg-global: #F8F9FA;
          --bg-sidebar: #F5F3EE;
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

        .lc {
          font-family: 'Inter', sans-serif;
          color: var(--text-dark);
        }

        .lc h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
        .lc .subtitle { color: var(--text-muted); font-size: 14px; }

        .lc .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .lc .kpi-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: var(--shadow);
          border: 1px solid rgba(0,0,0,0.01);
        }

        .lc .kpi-icon-box {
          width: 54px;
          height: 54px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .lc .kpi-card:nth-child(1) .kpi-icon-box { background-color: var(--green-light); color: var(--green-primary); }
        .lc .kpi-card:nth-child(2) .kpi-icon-box { background-color: #F4FBF7; color: var(--green-text); }
        .lc .kpi-card:nth-child(3) .kpi-icon-box { background-color: var(--coral-light); color: var(--coral-text); }

        .lc .kpi-info span { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        .lc .kpi-info h2 { font-size: 26px; font-weight: 700; margin: 2px 0; }
        .lc .kpi-info h2.positive { color: var(--green-text); }
        .lc .kpi-info h2.negative { color: var(--coral-text); }
        .lc .kpi-info p { font-size: 12px; color: var(--text-muted); }

        .lc .filter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .lc .filter-chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .lc .chip {
          background: var(--white);
          border: 1px solid var(--border-color);
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lc .chip.active-green { background: var(--green-primary); color: var(--white); border-color: var(--green-primary); }
        .lc .chip.active-light-green { background: var(--green-light); color: var(--green-primary); border-color: transparent; }
        .lc .chip.active-orange { background: var(--orange-light); color: var(--orange-text); border-color: transparent; }

        .lc .chip .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--orange-text);
          border-radius: 50%;
          margin-left: 6px;
          vertical-align: middle;
        }

        .lc .form-card {
          background: var(--white);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow);
          margin-bottom: 35px;
          border: 1px solid rgba(0,0,0,0.01);
        }

        .lc .form-card h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lc .form-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .lc .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lc .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .lc .type-selectors {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .lc .type-btn {
          background: var(--white);
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .lc .type-btn.active-orange {
          border: 1px solid var(--orange-text);
          color: var(--orange-text);
          background-color: var(--orange-light);
        }

        .lc .form-control {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 14px;
          background-color: var(--white);
          outline: none;
          font-family: inherit;
        }

        .lc .form-control.value-input {
          background-color: #F4FBF7;
          border-color: transparent;
          color: var(--green-text);
          font-weight: 700;
          font-size: 18px;
          text-align: right;
        }

        .lc .form-row-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .lc .description-block {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        .lc .btn-submit {
          background-color: var(--green-primary);
          color: var(--white);
          border: none;
          padding: 14px 24px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          height: 45px;
        }

        .lc .history-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .lc .history-section-header h3 { font-size: 16px; font-weight: 600; }

        .lc .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lc .history-item {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 16px 24px;
          display: grid;
          grid-template-columns: 2.5fr 1.5fr 1.5fr 1fr 1.5fr 20px;
          align-items: center;
          box-shadow: var(--shadow);
          border: 1px solid rgba(0,0,0,0.01);
        }

        .lc .item-main { display: flex; align-items: center; gap: 14px; }
        .lc .item-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .lc .item-title h4 { font-size: 14px; font-weight: 600; }
        .lc .item-title p { font-size: 12px; color: var(--text-muted); }

        .lc .item-meta { font-size: 13px; font-weight: 500; }
        .lc .item-meta span { display: block; font-size: 11px; color: var(--text-muted); font-weight: 400; }

        .lc .badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          width: fit-content;
        }
        .lc .badge.pago { background-color: var(--green-light); color: var(--green-primary); }
        .lc .badge.pendente { background-color: var(--orange-light); color: var(--orange-text); }

        .lc .item-value {
          font-size: 15px;
          font-weight: 700;
          text-align: right;
          padding-right: 10px;
        }
        .lc .item-value.positive { color: var(--green-text); }
        .lc .item-value.negative { color: var(--coral-text); }

        .lc .arrow-link { color: var(--text-muted); text-align: right; font-weight: bold; cursor: pointer; }

        .lc .fab-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 56px;
          height: 56px;
          background-color: var(--green-primary);
          color: var(--white);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0px 4px 16px rgba(15, 110, 54, 0.3);
          cursor: pointer;
          border: none;
          z-index: 50;
        }

        .lc .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .lc .date-picker, .lc .btn-filter-trigger {
          background: var(--white);
          border: 1px solid var(--border-color);
          padding: 10px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 1100px) {
          .lc .kpi-grid, .lc .form-grid, .lc .form-row-bottom { grid-template-columns: 1fr; }
          .lc .history-item { grid-template-columns: 1fr 1fr; gap: 15px; }
          .lc .item-value, .lc .arrow-link { text-align: left; }
        }
      `}</style>

      <div className="lc">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1>Lançamentos</h1>
            <p className="subtitle">Registre e acompanhe todas as suas movimentações financeiras.</p>
          </div>
          <div className="header-actions">
            <button className="date-picker">📅 Maio / 2026 ▾</button>
            <div style={{ fontSize: 20, cursor: "pointer" }}>🔔</div>
          </div>
        </div>

        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-box">📊</div>
            <div className="kpi-info">
              <span>Total de lançamentos</span>
              <h2>8</h2>
              <p>Neste mês</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-box">↑</div>
            <div className="kpi-info">
              <span>Receitas</span>
              <h2 className="positive">+R$ 339,00</h2>
              <p>Neste mês</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-box">↓</div>
            <div className="kpi-info">
              <span>Despesas</span>
              <h2 className="negative">-R$ 155,00</h2>
              <p>Neste mês</p>
            </div>
          </div>
        </section>

        <section className="filter-row">
          <div className="filter-chips">
            {filters.map((f) => (
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
          <button className="btn-filter-trigger">🎛️ Filtros</button>
        </section>

        <section className="form-card">
          <h3><span>➕</span> Novo lançamento</h3>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo</label>
                <div className="type-selectors">
                  {["🌱 Receita", "📌 Fixo", "📦 Variável", "💳 Parcelado"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`type-btn ${t.includes("Variável") ? "active-orange" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select className="form-control">
                  <option>🚗 Uber</option>
                  <option>🍿 Lazer</option>
                  <option>🛒 Alimentação</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor</label>
                <input type="text" className="form-control value-input" defaultValue="R$ 30,00" />
              </div>
            </div>

            <div className="form-row-bottom">
              <div className="form-group">
                <label>Data</label>
                <select className="form-control">
                  <option>📅 20/05/2026</option>
                </select>
              </div>
              <div className="form-group">
                <label>Pagamento</label>
                <select className="form-control">
                  <option>💳 Crédito</option>
                  <option>💵 Dinheiro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Titular</label>
                <select className="form-control">
                  <option>👤 Higor</option>
                </select>
              </div>
            </div>

            <div className="form-group description-block">
              <div style={{ flex: 1 }}>
                <label>Descrição</label>
                <input type="text" className="form-control" defaultValue="Ida para igreja" />
              </div>
              <button type="submit" className="btn-submit">＋ Adicionar lançamento</button>
            </div>
          </form>
        </section>

        <section className="history-section-header">
          <h3>Histórico de lançamentos</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="date-picker">Mais recentes ▾</button>
          </div>
        </section>

        <section className="history-list">
          {history.map((item, i) => (
            <div className="history-item" key={i}>
              <div className="item-main">
                <div className="item-icon">{item.icon}</div>
                <div className="item-title">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
              <div className="item-meta">
                {item.meta}
                <span>{item.bank}</span>
              </div>
              <div className="item-meta">
                {item.date}
                <span>{item.dateLabel}</span>
              </div>
              <div>
                <span className={`badge ${item.badge}`}>● {item.badge === "pago" ? "Pago" : "Pendente"}</span>
              </div>
              <div className={`item-value ${item.positive ? "positive" : "negative"}`}>
                {item.value}
              </div>
              <div className="arrow-link">❯</div>
            </div>
          ))}
        </section>
      </div>

      <button className="fab-btn">＋</button>
    </>
  );
}

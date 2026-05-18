export const KINDS = [
  { value: "fixo", label: "Gasto Fixo" },
  { value: "variavel", label: "Gasto Variável" },
  { value: "parcelamento", label: "Parcelamento" },
  { value: "receita", label: "Receita" },
] as const;

// Used to seed categorias on first access
export const SEED_CATEGORIES: Record<string, string[]> = {
  fixo: [
    "MEI", "Financiamento Apto", "Financiamento Carro", "Feira", "IPTU", "IPVA",
    "Energia", "Água", "Internet", "Dados Móveis", "Streaming", "Gás", "Salão",
    "Barbearia", "Academia", "Plano de Saúde", "Faculdade", "Dízimo", "Seguro",
    "Consórcio", "Mercado", "Padaria", "Gasolina",
  ],
  variavel: [
    "Uber", "99", "Lazer", "Restaurante", "Alimentação", "Lanches", "Farmácia",
    "Transporte", "Cinema", "Estacionamento", "Presentes", "Oferta", "Doações",
    "Shoppe", "Construção",
  ],
  parcelamento: ["Celular", "Computador", "Relógio", "Viagem", "Hospedagem", "Óculos", "Roupas"],
  receita: ["Salário", "Freelance", "Rendimento", "Outros"],
};

export const TITULARES = ["Higor", "Mirelly"];
export const PAYMENT_METHODS = ["PIX", "Dinheiro", "Débito", "Crédito"];
export const BANKS = [
  "NUBANK", "INTER", "XP", "NEON", "BRADESCO", "CAIXA", "MERCADO PAGO",
  "SANTANDER", "BANCO DO BRASIL",
];

export function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

/** First day of month (YYYY-MM-01) for an ISO date string */
export function monthStart(iso: string): string {
  return iso.slice(0, 7) + "-01";
}

/**
 * Regime de caixa para crédito.
 * Regra estrita: se `dia da compra >= (dia_fechamento - 1)`, a compra cai na
 * fatura do mês seguinte (M+1). Caso contrário, fica no mês corrente.
 * Demais formas de pagamento → mês de occurredOn.
 * Se o mês calculado estiver em `closedMonths` (fatura paga), empurra para o
 * próximo mês aberto.
 *
 * IMPORTANTE: occurredOn é tratado como string local YYYY-MM-DD —
 * nunca passa por `new Date()` para evitar deslocamento de fuso.
 */
export function computeCompetenceMonth(
  occurredOn: string,
  paymentMethod: string | null | undefined,
  closingDay: number | null | undefined,
  closedMonths: string[] = [],
): string {
  let base: string;
  if (paymentMethod === "Crédito" && closingDay) {
    const [y, m, d] = occurredOn.split("-").map(Number);
    let year = y, month = m;
    if (d >= closingDay - 1) {
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    base = `${year}-${String(month).padStart(2, "0")}-01`;
  } else {
    base = monthStart(occurredOn);
  }
  const closed = new Set(closedMonths);
  // safety bound to prevent infinite loops
  for (let i = 0; i < 24 && closed.has(base); i++) base = addMonths(base, 1);
  return base;
}

/** Parse YYYY-MM-DD como data local (sem fuso UTC) */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Exibe YYYY-MM-DD no formato dd/mm/aaaa sem deslocamento de fuso */
export function formatDateBR(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("pt-BR");
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Exibe competência (YYYY-MM-01) como "Maio/2026" */
export function formatCompetenceBR(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return `${MESES_PT[(m ?? 1) - 1]}/${y}`;
}

/**
 * Calcula a data real de vencimento da fatura combinando o ano/mês da
 * competência (YYYY-MM-01) com o `dueDay` do cartão. Se cair em sábado,
 * empurra +2 dias; se cair em domingo, +1 dia (vai para segunda-feira).
 * Retorna YYYY-MM-DD.
 */
export function computeDueDate(competenceMonth: string, dueDay: number): string {
  const [y, m] = competenceMonth.slice(0, 7).split("-").map(Number);
  // limita ao último dia do mês para evitar overflow (ex: dia 31 em fev)
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  const d = new Date(y, m - 1, day);
  const dow = d.getDay(); // 0=Dom, 6=Sáb
  if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Adiciona N meses a um YYYY-MM-DD, retornando YYYY-MM-01 */
export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  let year = y, month = m + n;
  while (month > 12) { month -= 12; year += 1; }
  while (month < 1) { month += 12; year -= 1; }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

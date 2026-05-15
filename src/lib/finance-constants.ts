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
 * Regime de caixa para crédito: se dia <= fechamento → mês atual; senão → mês seguinte.
 * Demais formas de pagamento → mês de occurredOn.
 */
export function computeCompetenceMonth(
  occurredOn: string,
  paymentMethod: string | null | undefined,
  closingDay: number | null | undefined,
): string {
  if (paymentMethod !== "Crédito" || !closingDay) return monthStart(occurredOn);
  const [y, m, d] = occurredOn.split("-").map(Number);
  const day = d;
  let year = y, month = m;
  if (day > closingDay) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Adiciona N meses a um YYYY-MM-DD, retornando YYYY-MM-01 */
export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  let year = y, month = m + n;
  while (month > 12) { month -= 12; year += 1; }
  while (month < 1) { month += 12; year -= 1; }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

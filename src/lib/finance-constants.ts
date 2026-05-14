export const KINDS = [
  { value: "fixo", label: "Gasto Fixo" },
  { value: "variavel", label: "Gasto Variável" },
  { value: "parcelamento", label: "Parcelamento" },
  { value: "receita", label: "Receita" },
] as const;

export const CATEGORIES_FIXO = [
  "MEI", "Financiamento Apto", "Financiamento Carro", "Feira", "IPTU", "IPVA",
  "Energia", "Água", "Internet", "Dados Móveis", "Streaming", "Gás", "Salão",
  "Barbearia", "Academia", "Plano de Saúde", "Faculdade", "Dízimo", "Seguro",
  "Consórcio", "Mercado", "Padaria", "Gasolina",
];

export const CATEGORIES_VARIAVEL = [
  "Uber", "99", "Lazer", "Restaurante", "Alimentação", "Lanches", "Farmácia",
  "Transporte", "Cinema", "Estacionamento", "Presentes", "Oferta", "Doações",
  "Dados Móveis", "Shoppe", "Construção",
];

export const CATEGORIES_PARCELAMENTO = [
  "Celular", "Computador", "Relógio", "Viagem", "Hospedagem", "Óculos", "Roupas",
];

export const CATEGORIES_RECEITA = ["Salário", "Freelance", "Rendimento", "Outros"];

export const TITULARES = ["Mirelly", "Higor"];

export const PAYMENT_METHODS = ["PIX", "Dinheiro", "Débito", "Crédito"];

export const BANKS = [
  "NUBANK", "INTER", "XP", "NEON", "BRADESCO", "CAIXA", "MERCADO PAGO",
  "SANTANDER", "BANCO DO BRASIL",
];

export function categoriesFor(kind: string): string[] {
  switch (kind) {
    case "fixo": return CATEGORIES_FIXO;
    case "variavel": return CATEGORIES_VARIAVEL;
    case "parcelamento": return CATEGORIES_PARCELAMENTO;
    case "receita": return CATEGORIES_RECEITA;
    default: return [];
  }
}

export function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

## Objetivo
Adicionar status "pago/pendente" aos lançamentos, refletir fatura de cartão já liquidada, recalcular o saldo principal de Maio e exibir um card de "Planejamento para Junho" no Dashboard.

## 1. Banco de dados
- Adicionar coluna `status text not null default 'pendente'` à tabela `transactions` (valores: `'pago' | 'pendente'`).
- Backfill: marcar como `'pago'` automaticamente todos os lançamentos cuja `competence_month` esteja em `closed_months` (mesma regra — fatura/mês fechado = liquidado).

## 2. Lógica de competência (já existe)
- A função `computeCompetenceMonth` já empurra gastos para o próximo mês quando o mês-base está em `closed_months`. Item 2 do pedido (compras pós-fechamento vão para Junho) já está coberto — sem mudanças.

## 3. Lançamentos (`lancamentos.tsx`)
- Novo seletor "Status" (Pago / Pendente) no formulário, default Pendente.
- Coluna "Status" na tabela com badge verde "Liquidado" / âmbar "Pendente".
- Botão rápido para alternar status direto na linha (check icon).

## 4. Dashboard (`dashboard.tsx`)
- **Cards principais** ganham subtítulos:
  - "Receitas" — sem mudança.
  - "Gastos" — divide em `Pagos` e `Pendentes` (soma total continua igual).
  - **Saldo** passa a refletir a nova fórmula:
    `Saldo = Receitas − (Gastos com status='pago' no mês, todas as formas de pagamento, incluindo a fatura de crédito do mês que foi marcada como paga)`.
    Gastos pendentes deixam de impactar o saldo (aparecem só como "a pagar").
- **Card "Planejamento para {próximo mês}"** (lateral, ao lado de Receitas/Gastos): soma `amount` de transações com `competence_month = next_month`, mostrando total e quebra rápida (fixos/variáveis/crédito).
- **Modal de detalhamento** dos cards mostra badge de status por linha.
- **Resumo por cartão** mostra badge "Fatura paga" quando o `competence_month` correspondente está em `closed_months`, e exibe o valor riscado/em verde.

## 5. Considerações de UI
- Verde semântico: usar `text-emerald-600 / bg-emerald-500/10` (tokens existentes via Tailwind).
- Mantém filtros de titular e mês.

## Arquivos afetados
- `supabase/migrations/*_add_status_to_transactions.sql`
- `src/lib/finance-constants.ts` (constante `TRANSACTION_STATUS`)
- `src/routes/_authenticated/lancamentos.tsx` (form + tabela + toggle)
- `src/routes/_authenticated/dashboard.tsx` (saldo, gastos pagos/pendentes, card de Junho, badge de cartão)

Após aprovação, executo a migração e em seguida as edições de código.
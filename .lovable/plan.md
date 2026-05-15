## Evolução Cesar Finanças → ERP Financeiro

Vou implementar em 5 blocos integrados. Antes de codar, preciso confirmar algumas decisões críticas que mudam a arquitetura.

### Bloco 1 — Categorias normalizadas (FK)
- Nova tabela `categories` (`id`, `user_id`, `name`, `kind`, `created_at`), única por (`user_id`, `kind`, `lower(name)`).
- Seed automático com as listas atuais de `finance-constants.ts` no primeiro acesso do admin.
- `transactions.category` passa a ser `category_id uuid` (FK). Migração converte os textos atuais para FKs criando o que faltar.
- Tela "Categorias" (CRUD) sob `_authenticated/categorias.tsx`.
- Form de Lançamento: dropdown carregado do banco, filtrado pelo `kind` selecionado.

### Bloco 2 — Cartões + regime de caixa
- Nova tabela `cards` (`id`, `user_id`, `name`, `bank`, `closing_day` 1–31, `due_day` 1–31, `titular`).
- Em `transactions`: adicionar `card_id uuid null` e `competence_month date` (1º dia do mês de competência).
- Regra automática ao salvar lançamento de **Crédito**:
  - Se `occurred_on.day <= closing_day` → competência = mês de `occurred_on`.
  - Se `occurred_on.day >  closing_day` → competência = mês seguinte.
- Lançamentos não-crédito: competência = mês de `occurred_on`.
- Parcelamentos: cria N linhas, cada uma com competência avançando 1 mês a partir da regra acima.
- Dashboard, Relatórios, Saldo Mensal e Tabela Anual passam a agrupar por `competence_month` (não por `occurred_on`). Listagem de Lançamentos continua mostrando `occurred_on` mas com coluna "Competência".

### Bloco 3 — Filtro global por Titular
- `<TitularFilter>` no `AppShell` (Todos / Higor / Mirelly), persistido em `localStorage` + Context.
- Hook `useTitularFilter()` aplicado em Dashboard, Lançamentos, Relatórios, Relatórios Consolidados, Metas.

### Bloco 4 — Dashboard / UI
- **Projeção futura** na Tabela Anual e Relatórios Consolidados: para meses ≥ mês atual, somar (a) gastos fixos do último mês fechado replicados, (b) parcelas de crédito já agendadas com competência futura.
- **Metas**: trocar texto por `Progress` circular (SVG) com % e valores.
- **Gráfico de categorias**: se `categorias > 6` → BarChart horizontal ordenado desc; senão mantém PieChart.

### Bloco 5 — Banco condicional
- Form de Lançamento: `banco` obrigatório se `forma_pagamento ≠ Dinheiro`.
- Quando forma = Crédito ou Débito, o seletor de "Banco" passa a ser seletor de **Cartão** (lista de `cards` do titular). Ao escolher o cartão, `bank` é auto-preenchido.

### Detalhes técnicos
- Migrações: 1 migração consolidada criando `categories`, `cards`, alterando `transactions` (add `card_id`, `competence_month`, `category_id`), backfill, depois drop da coluna `category` antiga (texto). RLS por `user_id` em todas.
- `finance-constants.ts` mantém apenas KINDS, TITULARES, PAYMENT_METHODS, BANKS (fallback). Categorias passam a vir do banco.
- Webhook do Telegram precisa resolver `category` → `category_id` (cria se não existir) e aplicar a mesma regra de competência.

---

### ❓ Preciso confirmar antes de migrar (afeta dados existentes)

1. **Backfill do `competence_month`** dos lançamentos atuais de Crédito: aplico a regra de fechamento? Para isso preciso já ter os cartões cadastrados. Posso fazer o backfill assumindo competência = mês de `occurred_on` para tudo (você re-categoriza depois conforme cadastrar os cartões), ou prefere que eu pause e peça os cartões antes?
2. **Cartões iniciais**: quais cartões cadastro de partida? Sugiro Nubank, Inter — me passe `dia de fechamento` e `dia de vencimento` de cada e o titular, ou cadastro vazio para você preencher na nova tela.
3. **Regra de competência no dia exato do fechamento** (ex.: fechamento dia 5, compra dia 5): conta no mês atual ou já vai pro próximo? Padrão proposto: `dia <= fechamento` = mês atual.

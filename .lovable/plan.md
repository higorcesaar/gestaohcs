# Plano: Gestão Orçamentária + Dashboard redesenhado

Vou implementar duas grandes mudanças no Cesar Finanças, baseadas nas imagens enviadas.

## 1. Nova página: Gestão Orçamentária (`/orcamentos`)

Replica a imagem 1. Permite definir um orçamento mensal por categoria e acompanhar o uso real (vs. transações lançadas).

**Banco de dados** (nova migração):
- Tabela `monthly_budgets` (user_id, competence_month, total_amount, tip_text)
- Tabela `category_budgets` (user_id, competence_month, category, planned_amount)
- RLS por `user_id`

**UI da página** (`src/routes/_authenticated/orcamentos.tsx`):
- Header com seletor Mês/Ano e botão "Marcar leitura como paga"
- 4 cards de resumo: Orçamento mensal, Total utilizado, Restante, Previsto até fim do mês
- Donut chart % utilizado (recharts)
- Tabela "Orçamento por categorias": Categoria, Orçamento, Gasto (real do mês), Barra de progresso, %, Restante, Status (Normal/Atenção/Ultrapassado)
- Card lateral "Previsão de gastos" (baseado na média dos últimos 3 meses) com badge Provável ultrapassar / Ultrapassará / Dentro do limite
- Card "Resumo orçamentário" — distribuição Necessidades / Desejos / Poupança (donut + legenda com %)
- Card "Planejamento do mês" com dica editável
- Card "Metas financeiras" (puxa de `goals` existente)
- Card "Dicas para o mês" gerado dinamicamente conforme estado das categorias

## 2. Redesign do Dashboard (`/dashboard`)

Reorganiza a página atual para combinar com a imagem 2.

- **Card grande de Saldo**: Saldo atual (grande, verde), variação vs mês anterior, "Visão geral do mês" (Receitas / Despesas), Resultado previsto, botão "Ver detalhes completos"
- **5 KPI cards em linha**: Receitas, Despesas Fixas, Despesas Variáveis, Parcelamentos, A pagar (total) — cada um com mini gráfico (sparkline / barras / donut)
- **Card "Fluxo financeiro do mês"** com diagrama Sankey-like simplificado: Receitas → Total Despesas → quebra em Fixas/Variáveis/Parcelamentos/Outros (% e valor por bucket), Déficit/Superávit do mês
- **Card "Alertas e avisos"**: cartões a vencer, parcelas próximas, variação de gastos
- **Lançamentos recentes** (últimos 5)
- **Gastos por categoria** (top 6 com barra horizontal)
- **Resumo dos cartões** (uso de limite com barra de progresso)

## 3. Itens da lateral

Adicionar à sidebar do `AppShell`, agrupados:

**FINANCEIRO**: Contas, Orçamentos, Planejamento  
**CONFIGURAÇÕES**: Configurações, Backup e Dados

Páginas novas (stubs funcionais para já existirem rotas):
- `/contas` — lista de contas bancárias (tabela `accounts` com saldo, banco, tipo)
- `/planejamento` — visão futura simplificada (reutiliza dados)
- `/configuracoes` — preferências do usuário (tema, moeda padrão)
- `/backup` — exportar dados em JSON/CSV e importar

Apenas `/contas`, `/configuracoes` e `/backup` precisam de banco novo:
- `accounts` (user_id, name, bank, type, balance, color)
- `user_preferences` (user_id, theme, default_titular, currency, tip_planejamento)

## Ordem de execução

1. Migração SQL (todas as tabelas novas + RLS) → aguardar aprovação
2. Atualizar `AppShell` com grupos da sidebar
3. Criar rotas stub (`/contas`, `/planejamento`, `/configuracoes`, `/backup`)
4. Implementar `/orcamentos` completo
5. Redesenhar `/dashboard`
6. QA visual rápido

## Detalhes técnicos

- Cálculo "Previsto até fim do mês" = gasto atual + (média diária × dias restantes)
- "Previsão de gastos" por categoria = média dos últimos 3 meses fechados
- Status: Normal (<80%), Atenção (80-99%), Ultrapassado (≥100%)
- Necessidades = Moradia, Alimentação, Transporte, Saúde, Educação (configurável depois)
- Desejos = Lazer, Outros
- Poupança = saldo positivo + aportes em Metas
- Donut/Sankey via `recharts` (já instalado)
- Tudo respeita filtro de `titular` global e `competence_month`

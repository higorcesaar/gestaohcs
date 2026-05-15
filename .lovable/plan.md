
# Sistema de Fatura Paga e Transição de Competência

## 1. Banco de dados (nova tabela)

Criar `closed_months` para registrar competências liquidadas:

```sql
create table public.closed_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  competence_month date not null,  -- ex: 2026-05-01
  closed_at timestamptz not null default now(),
  unique (user_id, competence_month)
);
-- RLS: owner-only (select/insert/delete by user_id = auth.uid())
```

Marcar fatura como paga = INSERT. Reabrir = DELETE.

## 2. Lógica de competência (atualizar `computeCompetenceMonth`)

Nova assinatura aceita lista de meses fechados do usuário. Regra:

1. Calcular competência base (regra atual: crédito + dia fechamento).
2. **Enquanto** a competência calculada estiver em `closedMonths`, somar +1 mês.
3. Aplicar tanto para Crédito quanto para todos os outros métodos (gastos variáveis também são empurrados pra frente se o mês atual está fechado).

Isso resolve simultaneamente os itens 2 e 4 (bloqueio retroativo): se hoje é 15/mai, Nubank fechou dia 9 → base = junho; se já marcaram maio como fechado e fizer uma compra retroativa do dia 5 → base = maio (fechado) → empurra pra junho.

## 3. Hook compartilhado `useClosedMonths`

Hook que carrega os meses fechados do usuário (uma vez, com cache) e expõe:
- `closedMonths: string[]` (YYYY-MM-01)
- `isClosed(month)`
- `close(month)` / `reopen(month)`

Usado em Dashboard, Lançamentos e webhook do Telegram.

## 4. UI no Dashboard

- **Botão "Marcar fatura de {Mês} como paga"** ao lado do seletor de mês. Se já paga, vira "Reabrir fatura de {Mês}" com badge "Fechada".
- **Card "Previsão de Saída: {próximo mês}"** na linha de KPIs, somando todos os lançamentos com `competence_month = mês seguinte`.
- **Seletor de mês**: ao inicializar, se mês atual está em `closedMonths`, abrir no próximo mês.

## 5. UI em Lançamentos

- Ao salvar, usar `computeCompetenceMonth` já com `closedMonths`.
- Mostrar aviso discreto abaixo da data se a competência foi empurrada: "Será lançado em Junho/2026 (Maio fechado)."

## 6. Webhook do Telegram

Atualizar para também consultar `closed_months` e aplicar mesma regra de empurrar competência.

## Arquivos afetados

- `supabase/migrations/*` (nova migration)
- `src/lib/finance-constants.ts` — atualizar `computeCompetenceMonth`
- `src/hooks/use-closed-months.ts` — novo hook
- `src/routes/_authenticated/dashboard.tsx` — botão fatura paga, card próxima fatura, default month
- `src/routes/_authenticated/lancamentos.tsx` — usar closedMonths, mostrar aviso
- `src/routes/api/public/telegram/webhook.ts` — aplicar closedMonths

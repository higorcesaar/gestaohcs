ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS dias_antecedencia_fechamento integer NOT NULL DEFAULT 7;

-- Backfill: keep existing closing_day in sync por compatibilidade,
-- mas a nova lógica derivará o fechamento de (due_day - dias_antecedencia_fechamento).
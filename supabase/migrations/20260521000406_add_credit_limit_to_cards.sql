ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS credit_limit numeric NOT NULL DEFAULT 0;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check CHECK (status IN ('pago','pendente'));

UPDATE public.transactions t
  SET status = 'pago'
  WHERE EXISTS (
    SELECT 1 FROM public.closed_months cm
    WHERE cm.user_id = t.user_id
      AND cm.competence_month = t.competence_month
  );
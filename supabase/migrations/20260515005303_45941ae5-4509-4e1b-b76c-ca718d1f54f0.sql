-- Backfill card_id for credit transactions by matching bank + titular
UPDATE public.transactions t
SET card_id = c.id
FROM public.cards c
WHERE t.card_id IS NULL
  AND t.payment_method = 'Crédito'
  AND t.user_id = c.user_id
  AND upper(t.bank) = upper(c.bank)
  AND (
    (t.titular IS NOT NULL AND c.titular IS NOT NULL AND t.titular = c.titular)
    OR (
      -- if titular not specified, match only when bank has a single card for this user
      (t.titular IS NULL OR c.titular IS NULL)
      AND (SELECT count(*) FROM public.cards c2
           WHERE c2.user_id = t.user_id AND upper(c2.bank) = upper(t.bank)) = 1
    )
  );

-- Recompute competence_month for credit transactions that now have a card_id
UPDATE public.transactions t
SET competence_month = (
  CASE
    WHEN EXTRACT(DAY FROM t.occurred_on)::int <= c.closing_day
      THEN date_trunc('month', t.occurred_on)::date
    ELSE (date_trunc('month', t.occurred_on) + interval '1 month')::date
  END
)
FROM public.cards c
WHERE t.card_id = c.id
  AND t.payment_method = 'Crédito';
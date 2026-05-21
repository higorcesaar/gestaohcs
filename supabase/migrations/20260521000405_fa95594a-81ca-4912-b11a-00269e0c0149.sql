
-- Monthly budgets (overall)
CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competence_month date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  tip_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, competence_month)
);
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mb own all" ON public.monthly_budgets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER mb_updated BEFORE UPDATE ON public.monthly_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Category budgets
CREATE TABLE public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competence_month date NOT NULL,
  category text NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  group_kind text NOT NULL DEFAULT 'necessidade', -- necessidade | desejo | poupanca
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, competence_month, category)
);
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb own all" ON public.category_budgets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER cb_updated BEFORE UPDATE ON public.category_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Accounts (Contas)
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  bank text,
  type text NOT NULL DEFAULT 'corrente', -- corrente | poupanca | investimento | dinheiro
  balance numeric NOT NULL DEFAULT 0,
  color text,
  titular text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts own all" ON public.accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User preferences
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  theme text DEFAULT 'light',
  default_titular text,
  currency text DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own all" ON public.user_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

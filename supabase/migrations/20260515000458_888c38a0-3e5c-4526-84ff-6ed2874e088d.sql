-- 1) Categories table (normalized, dedupe)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('fixo','variavel','parcelamento','receita')),
  name text not null,
  created_at timestamptz not null default now()
);
create unique index categories_user_kind_name_unique
  on public.categories (user_id, kind, lower(name));

alter table public.categories enable row level security;
create policy "categories own select" on public.categories for select using (user_id = auth.uid());
create policy "categories own insert" on public.categories for insert with check (user_id = auth.uid());
create policy "categories own update" on public.categories for update using (user_id = auth.uid());
create policy "categories own delete" on public.categories for delete using (user_id = auth.uid());

-- 2) Cards table
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  bank text not null,
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  titular text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cards enable row level security;
create policy "cards own select" on public.cards for select using (user_id = auth.uid());
create policy "cards own insert" on public.cards for insert with check (user_id = auth.uid());
create policy "cards own update" on public.cards for update using (user_id = auth.uid());
create policy "cards own delete" on public.cards for delete using (user_id = auth.uid());
create trigger cards_updated_at before update on public.cards
  for each row execute function public.update_updated_at_column();

-- 3) Transactions: add card_id + competence_month
alter table public.transactions
  add column card_id uuid references public.cards(id) on delete set null,
  add column competence_month date;

-- Backfill competence_month = first day of occurred_on month
update public.transactions
   set competence_month = date_trunc('month', occurred_on)::date
 where competence_month is null;

alter table public.transactions
  alter column competence_month set not null,
  alter column competence_month set default (date_trunc('month', current_date)::date);

create index transactions_competence_idx on public.transactions (user_id, competence_month);
create index transactions_titular_idx on public.transactions (user_id, titular);

-- 4) Backfill categories from existing distinct transactions
insert into public.categories (user_id, kind, name)
select distinct user_id, kind, category
  from public.transactions
 where category is not null and category <> ''
on conflict do nothing;
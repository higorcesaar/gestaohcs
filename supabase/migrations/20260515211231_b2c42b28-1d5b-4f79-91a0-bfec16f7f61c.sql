create table public.closed_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  competence_month date not null,
  closed_at timestamptz not null default now(),
  unique (user_id, competence_month)
);

alter table public.closed_months enable row level security;

create policy "closed_months own select" on public.closed_months
  for select using (user_id = auth.uid());
create policy "closed_months own insert" on public.closed_months
  for insert with check (user_id = auth.uid());
create policy "closed_months own delete" on public.closed_months
  for delete using (user_id = auth.uid());

create index closed_months_user_month_idx on public.closed_months(user_id, competence_month);
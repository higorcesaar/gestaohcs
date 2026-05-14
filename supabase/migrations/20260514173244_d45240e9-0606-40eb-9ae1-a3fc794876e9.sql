
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Allowed emails (whitelist)
create table public.allowed_emails (
  email text primary key,
  added_by uuid references auth.users(id),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

insert into public.allowed_emails (email, is_admin) values ('higorcesaar@gmail.com', true);

-- Block signups not in allowlist; auto-create profile + role
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_allowed public.allowed_emails%rowtype;
begin
  select * into v_allowed from public.allowed_emails where lower(email) = lower(new.email);
  if not found then
    raise exception 'E-mail % não autorizado a se cadastrar.', new.email;
  end if;

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, case when v_allowed.is_admin then 'admin'::public.app_role else 'user'::public.app_role end);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null default current_date,
  kind text not null check (kind in ('fixo','variavel','parcelamento','receita')),
  category text not null,
  titular text,
  payment_method text,
  bank text,
  description text,
  amount numeric(14,2) not null,
  installments_total integer,
  installment_no integer,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

-- Telegram messages
create table public.telegram_messages (
  update_id bigint primary key,
  chat_id bigint not null,
  from_user_id bigint,
  from_username text,
  from_name text,
  text text,
  raw_update jsonb not null,
  forwarded boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.telegram_messages enable row level security;

-- RLS policies
create policy "profiles select own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "user_roles select own or admin" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles admin manage" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "allowed_emails admin all" on public.allowed_emails
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "transactions own select" on public.transactions
  for select to authenticated using (user_id = auth.uid());
create policy "transactions own insert" on public.transactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "transactions own update" on public.transactions
  for update to authenticated using (user_id = auth.uid());
create policy "transactions own delete" on public.transactions
  for delete to authenticated using (user_id = auth.uid());

create policy "telegram admin select" on public.telegram_messages
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

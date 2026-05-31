-- MCP-0D — Trust layer tables (Product Q&A, returns, support tickets) + RLS.
-- Reviews, disputes, refunds, trust_scores already exist and are reused.

create extension if not exists "pgcrypto";

-- ── Product Q&A ──
create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  question text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists product_questions_product_idx on public.product_questions (product_id);

create table if not exists public.product_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.product_questions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  body text not null,
  by_seller boolean not null default false,
  votes integer not null default 0,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_answers_question_idx on public.product_answers (question_id);

-- ── Returns ──
do $$
begin
  create type public.return_state as enum ('requested','approved','rejected','in_transit','received','resolved','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  state public.return_state not null default 'requested',
  reason text not null,
  evidence_paths text[] not null default '{}',
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists return_requests_vendor_idx on public.return_requests (vendor_id);
create index if not exists return_requests_state_idx on public.return_requests (state);

-- ── Support tickets ──
do $$
begin
  create type public.support_priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;
do $$
begin
  create type public.support_status as enum ('open','in_progress','waiting','resolved','closed');
exception when duplicate_object then null; end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  category text not null default 'other',
  priority public.support_priority not null default 'medium',
  status public.support_status not null default 'open',
  subject text not null,
  body text,
  first_response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_priority_idx on public.support_tickets (priority);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id);

-- ── RLS ──
alter table public.product_questions enable row level security;
alter table public.product_answers enable row level security;
alter table public.return_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

do $$
begin
  create policy "qa_public_read" on public.product_questions for select using (status <> 'hidden');
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "qa_authenticated_ask" on public.product_questions for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "answers_public_read" on public.product_answers for select using (true);
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "answers_authenticated_write" on public.product_answers for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "returns_owner_read" on public.return_requests
    for select to authenticated using (
      buyer_id = auth.uid()
      or exists (select 1 from public.vendor_members vm where vm.vendor_id = return_requests.vendor_id and vm.user_id = auth.uid() and vm.deleted_at is null)
    );
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "returns_buyer_create" on public.return_requests for insert to authenticated with check (buyer_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "support_owner_read" on public.support_tickets for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "support_owner_create" on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$
begin
  create policy "support_messages_read" on public.support_ticket_messages for select to authenticated using (true);
exception when duplicate_object then null; end $$;

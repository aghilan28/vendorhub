create type public.verification_state as enum (
  'NOT_SUBMITTED',
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
  'RESUBMISSION_REQUIRED',
  'SUSPENDED'
);

create type public.verification_document_type as enum (
  'AADHAAR',
  'PAN',
  'GST_CERTIFICATE',
  'BUSINESS_REGISTRATION',
  'BANK_PROOF',
  'ADDRESS_PROOF'
);

create table public.seller_kyc_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  business_name text not null,
  owner_name text not null,
  business_type text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  aadhaar_last4 text,
  pan_masked text,
  verification_state public.verification_state not null default 'NOT_SUBMITTED',
  submitted_at timestamptz,
  verified_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kyc_profile_id uuid not null references public.seller_kyc_profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  document_type public.verification_document_type not null,
  status public.verification_state not null default 'NOT_SUBMITTED',
  file_name text,
  private_storage_path text,
  uploaded_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  rejection_reason text,
  is_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kyc_profile_id uuid not null references public.seller_kyc_profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  document_id uuid references public.verification_documents(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision public.verification_state not null,
  note text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.compliance_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'MEDIUM',
  status text not null default 'OPEN',
  title text not null,
  detail text not null,
  owner text not null default 'trust_ops',
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  score integer not null default 0 check (score between 0 and 100),
  trust_level text not null default 'emerging',
  factors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table public.bank_verification_placeholders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  account_holder_name text not null,
  bank_name text,
  masked_account_number text,
  ifsc text,
  status public.verification_state not null default 'NOT_SUBMITTED',
  payout_readiness text not null default 'blocked',
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.gst_verification_placeholders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  gstin text,
  legal_name text,
  status public.verification_state not null default 'NOT_SUBMITTED',
  invoice_enabled boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.trust_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'SYSTEM',
  action text not null,
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'seller_kyc_profiles',
    'verification_documents',
    'compliance_flags',
    'trust_scores',
    'bank_verification_placeholders',
    'gst_verification_placeholders'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create index seller_kyc_profiles_vendor_state_idx on public.seller_kyc_profiles(vendor_id, verification_state);
create index verification_documents_profile_type_idx on public.verification_documents(kyc_profile_id, document_type);
create index verification_reviews_vendor_created_idx on public.verification_reviews(vendor_id, created_at desc);
create index compliance_flags_vendor_status_idx on public.compliance_flags(vendor_id, status, severity);
create index trust_scores_level_idx on public.trust_scores(trust_level, score desc);
create index trust_audit_events_vendor_created_idx on public.trust_audit_events(vendor_id, created_at desc);

alter table public.seller_kyc_profiles enable row level security;
alter table public.verification_documents enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.compliance_flags enable row level security;
alter table public.trust_scores enable row level security;
alter table public.bank_verification_placeholders enable row level security;
alter table public.gst_verification_placeholders enable row level security;
alter table public.trust_audit_events enable row level security;

create policy "kyc_profiles_vendor_admin_select" on public.seller_kyc_profiles for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "kyc_profiles_vendor_admin_write" on public.seller_kyc_profiles for all using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "verification_documents_private_select" on public.verification_documents for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "verification_documents_private_write" on public.verification_documents for all using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "verification_reviews_admin_select_vendor_read" on public.verification_reviews for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "verification_reviews_admin_insert" on public.verification_reviews for insert with check (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "compliance_flags_vendor_admin_select" on public.compliance_flags for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "compliance_flags_admin_write" on public.compliance_flags for all using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "trust_scores_public_select" on public.trust_scores for select using (true);
create policy "trust_scores_admin_write" on public.trust_scores for all using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "bank_verification_vendor_admin_select" on public.bank_verification_placeholders for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "bank_verification_vendor_admin_write" on public.bank_verification_placeholders for all using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "gst_verification_public_select" on public.gst_verification_placeholders for select using (true);
create policy "gst_verification_vendor_admin_write" on public.gst_verification_placeholders for all using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "trust_audit_vendor_admin_select" on public.trust_audit_events for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "trust_audit_system_admin_insert" on public.trust_audit_events for insert with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

alter publication supabase_realtime add table public.seller_kyc_profiles;
alter publication supabase_realtime add table public.verification_reviews;
alter publication supabase_realtime add table public.compliance_flags;
alter publication supabase_realtime add table public.trust_scores;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('trust_kyc_infrastructure', 'Enables seller KYC profiles, verification review queues, document workflows, and trust scoring foundation.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('buyer_trust_indicators', 'Shows verified seller, GST, bank readiness, and trust score indicators to buyers.', true, 100, '{"roles":["BUYER"]}'),
  ('compliance_enforcement_foundation', 'Enables compliance flags, seller restrictions, suspension placeholders, and audit events.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();

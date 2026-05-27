create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  severity text not null default 'INFO',
  event_type text not null,
  source text not null default 'platform',
  ip_hash text,
  user_agent_hash text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.security_replay_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  key_hash text not null unique,
  scope text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.security_session_revocations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  revoked_by uuid references public.profiles(id) on delete set null,
  reason text not null,
  revoked_after timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.security_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  route text not null,
  bucket text not null,
  limit_count integer not null,
  window_ms integer not null,
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.record_security_event(
  event_type_text text,
  severity_text text default 'INFO',
  event_metadata jsonb default '{}'::jsonb,
  target_vendor_id uuid default null,
  request_id_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.security_events (actor_id, vendor_id, severity, event_type, request_id, metadata)
  values (auth.uid(), target_vendor_id, severity_text, event_type_text, request_id_text, event_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.register_replay_key(
  key_hash_text text,
  scope_text text,
  ttl_seconds integer default 300,
  replay_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_existing public.security_replay_keys%rowtype;
  v_expires_at timestamptz := now() + make_interval(secs => greatest(30, least(ttl_seconds, 86400)));
begin
  -- vendorhub-migration-safety: allow-destructive-cleanup id=security_replay_keys_expired_cleanup risk=low rollback=not_required
  -- Deterministic TTL cleanup for expired replay nonce metadata only; active keys and commerce records are not touched.
  delete from public.security_replay_keys where expires_at <= now();

  select * into v_existing
  from public.security_replay_keys
  where key_hash = key_hash_text and expires_at > now();

  if found then
    insert into public.security_events (actor_id, severity, event_type, source, metadata)
    values (auth.uid(), 'WARN', 'replay_rejected', 'security_rpc', jsonb_build_object('scope', scope_text));
    return jsonb_build_object('allowed', false, 'expires_at', v_existing.expires_at);
  end if;

  insert into public.security_replay_keys (key_hash, scope, actor_id, expires_at, metadata)
  values (key_hash_text, scope_text, auth.uid(), v_expires_at, replay_metadata);

  return jsonb_build_object('allowed', true, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.force_user_session_invalidation(
  target_user_id uuid,
  reason_text text,
  invalidation_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) then
    raise exception 'Only admins can invalidate sessions';
  end if;

  insert into public.security_session_revocations (user_id, revoked_by, reason, metadata)
  values (target_user_id, auth.uid(), reason_text, invalidation_metadata)
  returning id into v_id;

  update public.sessions_metadata
  set revoked_at = now()
  where user_id = target_user_id and revoked_at is null;

  insert into public.security_events (actor_id, severity, event_type, source, metadata)
  values (auth.uid(), 'CRITICAL', 'session_forced_invalidation', 'admin', jsonb_build_object('target_user_id', target_user_id, 'reason', reason_text));

  return v_id;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are append-only';
end;
$$;

drop trigger if exists audit_logs_prevent_update on public.audit_logs;
create trigger audit_logs_prevent_update before update or delete on public.audit_logs for each row execute function public.prevent_audit_log_mutation();

create index if not exists security_events_type_created_idx on public.security_events(event_type, created_at desc);
create index if not exists security_events_actor_created_idx on public.security_events(actor_id, created_at desc);
create index if not exists security_replay_keys_scope_expires_idx on public.security_replay_keys(scope, expires_at);
create index if not exists security_session_revocations_user_idx on public.security_session_revocations(user_id, revoked_after desc);
create index if not exists security_rate_limit_events_route_created_idx on public.security_rate_limit_events(route, created_at desc);

alter table public.security_events enable row level security;
alter table public.security_replay_keys enable row level security;
alter table public.security_session_revocations enable row level security;
alter table public.security_rate_limit_events enable row level security;

create policy "security_events_admin_select" on public.security_events for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "security_events_authenticated_insert" on public.security_events for insert with check (auth.role() = 'authenticated');

create policy "security_replay_keys_admin_select" on public.security_replay_keys for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "security_replay_keys_authenticated_insert" on public.security_replay_keys for insert with check (auth.role() = 'authenticated');

create policy "security_session_revocations_admin_all" on public.security_session_revocations for all using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "security_session_revocations_owner_select" on public.security_session_revocations for select using (user_id = auth.uid());

create policy "security_rate_limit_events_admin_select" on public.security_rate_limit_events for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "security_rate_limit_events_authenticated_insert" on public.security_rate_limit_events for insert with check (auth.role() = 'authenticated');

drop policy if exists "vendor_assets_authenticated_write" on storage.objects;
create policy "vendor_assets_vendor_scoped_write" on storage.objects for insert with check (
  bucket_id = 'vendor-assets'
  and auth.role() = 'authenticated'
  and (
    public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])
    or exists (
      select 1 from public.vendor_members vm
      where vm.user_id = auth.uid()
        and vm.deleted_at is null
        and (storage.foldername(name))[1] = vm.vendor_id::text
    )
  )
);

drop policy if exists "product_images_authenticated_write" on storage.objects;
create policy "product_images_vendor_scoped_write" on storage.objects for insert with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and (
    public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])
    or exists (
      select 1 from public.vendor_members vm
      where vm.user_id = auth.uid()
        and vm.deleted_at is null
        and (storage.foldername(name))[1] = vm.vendor_id::text
    )
  )
);

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_25_enterprise_security', 'Enables zero-trust route authorization, replay protection, security audit telemetry, upload boundary hardening, and admin session invalidation controls.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('security_replay_registry', 'Enables server-side replay key registration for critical mutations and webhooks.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('append_only_audit_guardrails', 'Prevents mutation of audit log rows after creation.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();

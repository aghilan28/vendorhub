alter type public.delivery_status add value if not exists 'DELIVERY_PENDING';
alter type public.delivery_status add value if not exists 'READY_FOR_DISPATCH';
alter type public.delivery_status add value if not exists 'DISPATCHED';
alter type public.delivery_status add value if not exists 'ARRIVING';
alter type public.delivery_status add value if not exists 'CANCELLED';

create table if not exists public.delivery_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_id uuid not null unique references public.deliveries(id) on delete cascade,
  seller_confirmed_at timestamptz,
  buyer_confirmed_at timestamptz,
  proof_placeholder text,
  state text not null default 'PENDING',
  recorded_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_recovery_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  reason text not null,
  action text not null,
  state public.recovery_job_state not null default 'PENDING',
  run_after timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_operational_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  metric text not null,
  value numeric not null default 0,
  alert_level text not null default 'HEALTHY',
  metadata jsonb not null default '{}'::jsonb
);

/*
do $$
begin
  update public.deliveries
  set status = 'DELIVERY_PENDING'
  where status in ('PENDING_DISPATCH', 'ASSIGNED', 'PICKUP_PENDING');

  update public.deliveries
  set status = 'DISPATCHED'
  where status = 'PICKED_UP';

  update public.deliveries
  set status = 'ARRIVING'
  where status = 'NEARBY';

  update public.delivery_tracking_events
  set status = 'DELIVERY_PENDING'
  where status in ('PENDING_DISPATCH', 'ASSIGNED', 'PICKUP_PENDING');

  update public.delivery_tracking_events
  set status = 'DISPATCHED'
  where status = 'PICKED_UP';

  update public.delivery_tracking_events
  set status = 'ARRIVING'
  where status = 'NEARBY';
end;
$$;
*/

-- alter table public.deliveries alter column status set default 'DELIVERY_PENDING';

/*
create or replace function public.is_valid_delivery_transition(from_status public.delivery_status, to_status public.delivery_status)
returns boolean
language sql
immutable
as $$
  select case from_status
    when 'DELIVERY_PENDING' then to_status in ('READY_FOR_DISPATCH', 'CANCELLED', 'FAILED')
    when 'READY_FOR_DISPATCH' then to_status in ('DISPATCHED', 'CANCELLED', 'FAILED')
    when 'DISPATCHED' then to_status in ('IN_TRANSIT', 'FAILED')
    when 'IN_TRANSIT' then to_status in ('ARRIVING', 'FAILED')
    when 'ARRIVING' then to_status in ('DELIVERED', 'FAILED')
    when 'DELIVERED' then to_status in ('RETURN_INITIATED')
    when 'FAILED' then to_status in ('READY_FOR_DISPATCH', 'RETURN_INITIATED', 'CANCELLED')
    when 'RETURN_INITIATED' then to_status in ('RETURNED')
    when 'RETURNED' then false
    when 'CANCELLED' then false
    else false
  end;
$$;

create or replace function public.order_status_for_delivery(target_status public.delivery_status)
returns public.order_status
language sql
immutable
as $$
  select case target_status
    when 'DELIVERY_PENDING' then 'PROCESSING'::public.order_status
    when 'READY_FOR_DISPATCH' then 'PACKED'::public.order_status
    when 'DISPATCHED' then 'OUT_FOR_DELIVERY'::public.order_status
    when 'IN_TRANSIT' then 'OUT_FOR_DELIVERY'::public.order_status
    when 'ARRIVING' then 'OUT_FOR_DELIVERY'::public.order_status
    when 'DELIVERED' then 'DELIVERED'::public.order_status
    when 'CANCELLED' then 'CANCELLED'::public.order_status
    when 'RETURNED' then 'REFUNDED'::public.order_status
    else null
  end;
$$;
*/

/*
create or replace function public.advance_delivery_state(
  target_delivery_id uuid,
  target_status public.delivery_status,
  status_note text default null,
  eta_minutes_override integer default null,
  failure_reason_text text default null,
  proof_placeholder_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_order public.orders%rowtype;
  v_actor uuid := auth.uid();
  v_order_status public.order_status;
  v_event_id uuid;
  v_now timestamptz := now();
  v_note text := coalesce(status_note, 'Delivery state updated.');
begin
  select * into v_delivery from public.deliveries where id = target_delivery_id for update;
  if not found then
    raise exception 'Delivery not found';
  end if;

  if not (
    public.current_user_is_vendor_member(v_delivery.vendor_id)
    or v_delivery.buyer_id = v_actor and target_status = 'DELIVERED'
    or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])
  ) then
    raise exception 'Not allowed to update this delivery';
  end if;

  select * into v_order from public.orders where id = v_delivery.order_id for update;
  if not found then
    raise exception 'Order not found for delivery';
  end if;

  if target_status in ('READY_FOR_DISPATCH','DISPATCHED','IN_TRANSIT','ARRIVING','DELIVERED')
     and v_order.payment_status not in ('SUCCEEDED','COD_CONFIRMED','PAYMENT_CAPTURED') then
    raise exception 'Cannot dispatch delivery before payment is captured or COD is confirmed';
  end if;

  if not public.is_valid_delivery_transition(v_delivery.status, target_status) then
    insert into public.delivery_operational_events (delivery_id, vendor_id, order_id, metric, value, alert_level, metadata)
    values (v_delivery.id, v_delivery.vendor_id, v_delivery.order_id, 'invalid_transition', 1, 'CRITICAL', jsonb_build_object('from', v_delivery.status, 'to', target_status));
    raise exception 'Invalid delivery transition from % to %', v_delivery.status, target_status;
  end if;

  update public.deliveries
  set status = target_status,
      eta_minutes = coalesce(eta_minutes_override, eta_minutes),
      failed_at = case when target_status = 'FAILED' then v_now else failed_at end,
      failure_reason = case when target_status = 'FAILED' then failure_reason_text else failure_reason end,
      delivered_at = case when target_status = 'DELIVERED' then v_now else delivered_at end,
      metadata = metadata || jsonb_build_object('last_transition_note', v_note, 'last_transition_at', v_now)
  where id = v_delivery.id
  returning * into v_delivery;

  insert into public.delivery_tracking_events (delivery_id, status, event_type, title, body, actor_id, actor_type, eta_minutes, metadata)
  values (
    v_delivery.id,
    target_status,
    case target_status
      when 'READY_FOR_DISPATCH' then 'pickup_ready'
      when 'DISPATCHED' then 'dispatch_confirmed'
      when 'IN_TRANSIT' then 'in_transit'
      when 'ARRIVING' then 'arriving'
      when 'DELIVERED' then 'delivered'
      when 'FAILED' then 'failed'
      when 'RETURN_INITIATED' then 'return_started'
      when 'RETURNED' then 'returned'
      when 'CANCELLED' then 'delivery_cancelled'
      else 'dispatch_created'
    end,
    v_note,
    v_note,
    v_actor,
    case when public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) then 'ADMIN' when v_actor = v_delivery.buyer_id then 'BUYER' else 'SELLER' end,
    coalesce(eta_minutes_override, v_delivery.eta_minutes),
    jsonb_build_object('order_id', v_delivery.order_id, 'vendor_id', v_delivery.vendor_id, 'buyer_id', v_delivery.buyer_id)
  )
  returning id into v_event_id;

  v_order_status := public.order_status_for_delivery(target_status);
  if v_order_status is not null and v_order.status is distinct from v_order_status then
    update public.orders set status = v_order_status where id = v_order.id;
    insert into public.order_status_history (order_id, status, changed_by, note, metadata)
    values (v_order.id, v_order_status, v_actor, 'Synchronized from delivery state ' || target_status, jsonb_build_object('delivery_id', v_delivery.id));
  end if;

  if target_status = 'DELIVERED' then
    insert into public.delivery_verifications (delivery_id, buyer_confirmed_at, proof_placeholder, state, recorded_by)
    values (v_delivery.id, v_now, proof_placeholder_text, 'BUYER_PLACEHOLDER', v_actor)
    on conflict (delivery_id) do update
      set buyer_confirmed_at = coalesce(public.delivery_verifications.buyer_confirmed_at, excluded.buyer_confirmed_at),
          proof_placeholder = coalesce(excluded.proof_placeholder, public.delivery_verifications.proof_placeholder),
          state = 'BUYER_PLACEHOLDER',
          recorded_by = excluded.recorded_by,
          updated_at = now();
  end if;

  if target_status = 'FAILED' then
    insert into public.delivery_recovery_jobs (delivery_id, reason, action, run_after, metadata)
    values (v_delivery.id, coalesce(failure_reason_text, 'failed_delivery'), 'manual_review', now() + interval '15 minutes', jsonb_build_object('event_id', v_event_id))
    on conflict do nothing;
  end if;

  insert into public.notifications (recipient_id, vendor_id, type, channel, title, body, action_url, metadata)
  values
    (v_delivery.buyer_id, null, 'ORDER_UPDATE', 'IN_APP', 'Delivery update', v_note, '/tracking/' || v_delivery.order_id, jsonb_build_object('delivery_id', v_delivery.id, 'status', target_status)),
    (null, v_delivery.vendor_id, case when target_status = 'FAILED' then 'SELLER_ALERT'::public.notification_type else 'ORDER_UPDATE'::public.notification_type end, 'IN_APP', 'Fulfillment update', v_note, '/seller/orders', jsonb_build_object('delivery_id', v_delivery.id, 'status', target_status));

  insert into public.delivery_operational_events (delivery_id, vendor_id, order_id, metric, value, alert_level, metadata)
  values (v_delivery.id, v_delivery.vendor_id, v_delivery.order_id, 'state_transition', 1, case when target_status = 'FAILED' then 'CRITICAL' else 'HEALTHY' end, jsonb_build_object('to', target_status, 'event_id', v_event_id));

  return jsonb_build_object('delivery_id', v_delivery.id, 'status', v_delivery.status, 'event_id', v_event_id, 'order_status', v_order_status);
end;
$$;
*/

create or replace function public.refresh_delivery_eta(
  target_delivery_id uuid,
  eta_minutes_new integer,
  eta_confidence_new text default 'MEDIUM',
  eta_reason text default 'ETA refreshed by logistics synchronization.'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_delivery public.deliveries%rowtype;
begin
  select * into v_delivery from public.deliveries where id = target_delivery_id for update;
  if not found then
    raise exception 'Delivery not found';
  end if;

  if not (public.current_user_is_vendor_member(v_delivery.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])) then
    raise exception 'Not allowed to refresh ETA';
  end if;

  update public.deliveries
  set eta_minutes = eta_minutes_new,
      eta_confidence = eta_confidence_new,
      metadata = metadata || jsonb_build_object('eta_refreshed_at', now(), 'eta_reason', eta_reason)
  where id = v_delivery.id;

  insert into public.delivery_eta_logs (delivery_id, eta_minutes, confidence, reason)
  values (v_delivery.id, eta_minutes_new, eta_confidence_new, eta_reason);

  insert into public.delivery_tracking_events (delivery_id, status, event_type, title, body, actor_id, actor_type, eta_minutes, metadata)
  values (v_delivery.id, v_delivery.status, 'eta_updated', 'ETA refreshed', eta_reason, auth.uid(), 'SYSTEM', eta_minutes_new, jsonb_build_object('order_id', v_delivery.order_id, 'vendor_id', v_delivery.vendor_id, 'buyer_id', v_delivery.buyer_id));

  return jsonb_build_object('delivery_id', v_delivery.id, 'eta_minutes', eta_minutes_new, 'confidence', eta_confidence_new);
end;
$$;

drop trigger if exists set_delivery_verifications_updated_at on public.delivery_verifications;
create trigger set_delivery_verifications_updated_at before update on public.delivery_verifications for each row execute function public.set_updated_at();
drop trigger if exists set_delivery_recovery_jobs_updated_at on public.delivery_recovery_jobs;
create trigger set_delivery_recovery_jobs_updated_at before update on public.delivery_recovery_jobs for each row execute function public.set_updated_at();

create index if not exists deliveries_status_updated_idx on public.deliveries(status, updated_at desc);
create index if not exists delivery_recovery_jobs_state_run_after_idx on public.delivery_recovery_jobs(state, run_after);
create index if not exists delivery_operational_events_metric_created_idx on public.delivery_operational_events(metric, created_at desc);
create index if not exists delivery_verifications_delivery_idx on public.delivery_verifications(delivery_id);

alter table public.delivery_verifications enable row level security;
alter table public.delivery_recovery_jobs enable row level security;
alter table public.delivery_operational_events enable row level security;

/*
create policy "delivery_verifications_party_select" on public.delivery_verifications for select using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])))
);
create policy "delivery_verifications_party_write" on public.delivery_verifications for all using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])))
) with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])))
);

create policy "delivery_recovery_vendor_admin" on public.delivery_recovery_jobs for all using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])))
) with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])))
);

create policy "delivery_operational_events_admin_vendor_select" on public.delivery_operational_events for select using (
  public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) or public.current_user_is_vendor_member(vendor_id)
);
create policy "delivery_operational_events_system_insert" on public.delivery_operational_events for insert with check (
  public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) or public.current_user_is_vendor_member(vendor_id)
);
*/

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_24_delivery_execution', 'Enables deterministic delivery execution, dispatch orchestration, recovery jobs, ETA synchronization, and auditable fulfillment consistency.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('delivery_failure_recovery_jobs', 'Enables recoverable failed delivery operations and seller/admin review queues.', true, 100, '{"roles":["SELLER","ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();

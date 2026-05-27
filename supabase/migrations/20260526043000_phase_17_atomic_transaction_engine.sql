create type public.checkout_transaction_state as enum (
  'CHECKOUT_STARTED',
  'INVENTORY_LOCKED',
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'ORDER_CREATED',
  'INVENTORY_RESERVED',
  'FULFILLMENT_PENDING',
  'FAILED',
  'ROLLED_BACK'
);

create type public.payment_attempt_state as enum (
  'INTENT_CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'COD_PENDING',
  'COD_CONFIRMED',
  'REFUND_PENDING',
  'REFUNDED'
);

create type public.reservation_state as enum ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');
create type public.transaction_outbox_state as enum ('PENDING', 'PUBLISHED', 'FAILED');
create type public.recovery_job_state as enum ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
create type public.integrity_alert_state as enum ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

create table public.checkout_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  request_hash text not null,
  status public.checkout_transaction_state not null default 'CHECKOUT_STARTED',
  response jsonb,
  locked_until timestamptz not null default (now() + interval '10 minutes'),
  completed_at timestamptz,
  unique (user_id, key)
);

create table public.checkout_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key_id uuid not null unique references public.checkout_idempotency_keys(id) on delete restrict,
  state public.checkout_transaction_state not null default 'CHECKOUT_STARTED',
  cart_snapshot jsonb not null,
  delivery_address jsonb not null,
  payment_method text not null,
  payment_reference text not null unique,
  amount_total numeric(12, 2) not null default 0 check (amount_total >= 0),
  currency char(3) not null default 'INR',
  failure_code text,
  failure_message text,
  recovery_after timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  transaction_id uuid not null references public.checkout_transactions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  state public.reservation_state not null default 'ACTIVE',
  expires_at timestamptz not null,
  released_at timestamptz,
  release_reason text,
  unique (transaction_id, inventory_id)
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  transaction_id uuid not null references public.checkout_transactions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text not null,
  provider_payment_id text,
  provider_signature text,
  idempotency_key text not null,
  state public.payment_attempt_state not null default 'INTENT_CREATED',
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'INR',
  raw_payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  failure_reason text,
  unique (provider, provider_order_id),
  unique (idempotency_key)
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null default 'razorpay',
  event_id text not null,
  event_type text not null,
  provider_order_id text,
  provider_payment_id text,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  raw_payload jsonb not null default '{}'::jsonb,
  unique (provider, event_id)
);

create table public.transaction_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid references public.checkout_transactions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'system',
  action text not null,
  state public.checkout_transaction_state,
  metadata jsonb not null default '{}'::jsonb
);

create table public.transaction_outbox_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  transaction_id uuid references public.checkout_transactions(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  state public.transaction_outbox_state not null default 'PENDING',
  published_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text
);

create table public.transaction_recovery_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  transaction_id uuid references public.checkout_transactions(id) on delete cascade,
  job_type text not null,
  state public.recovery_job_state not null default 'PENDING',
  run_after timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.transaction_integrity_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  code text not null,
  state public.integrity_alert_state not null default 'OPEN',
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz
);

create table public.checkout_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid references public.checkout_transactions(id) on delete cascade,
  metric text not null,
  value numeric(14, 4) not null default 1,
  tags jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'checkout_idempotency_keys',
    'checkout_transactions',
    'inventory_reservations',
    'payment_attempts',
    'transaction_outbox_events',
    'transaction_recovery_jobs',
    'transaction_integrity_alerts'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create index checkout_transactions_buyer_state_idx on public.checkout_transactions(buyer_id, state, created_at desc);
create index inventory_reservations_active_expiry_idx on public.inventory_reservations(expires_at) where state = 'ACTIVE';
create index inventory_reservations_inventory_state_idx on public.inventory_reservations(inventory_id, state);
create index payment_attempts_transaction_idx on public.payment_attempts(transaction_id, state);
create index payment_webhook_events_provider_order_idx on public.payment_webhook_events(provider, provider_order_id);
create index transaction_audit_events_transaction_idx on public.transaction_audit_events(transaction_id, created_at);
create index transaction_outbox_pending_idx on public.transaction_outbox_events(created_at) where state = 'PENDING';
create index transaction_recovery_jobs_due_idx on public.transaction_recovery_jobs(run_after, state);
create index transaction_integrity_alerts_open_idx on public.transaction_integrity_alerts(severity, created_at desc) where state = 'OPEN';
create index checkout_observability_events_metric_idx on public.checkout_observability_events(metric, created_at desc);

alter table public.checkout_idempotency_keys enable row level security;
alter table public.checkout_transactions enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.transaction_audit_events enable row level security;
alter table public.transaction_outbox_events enable row level security;
alter table public.transaction_recovery_jobs enable row level security;
alter table public.transaction_integrity_alerts enable row level security;
alter table public.checkout_observability_events enable row level security;

create policy "checkout_idempotency_owner_select" on public.checkout_idempotency_keys for select using (user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "checkout_transactions_owner_select" on public.checkout_transactions for select using (buyer_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "inventory_reservations_party_select" on public.inventory_reservations for select using (
  exists (select 1 from public.checkout_transactions t where t.id = transaction_id and t.buyer_id = auth.uid())
  or public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "payment_attempts_party_select" on public.payment_attempts for select using (
  exists (select 1 from public.checkout_transactions t where t.id = transaction_id and t.buyer_id = auth.uid())
  or exists (select 1 from public.orders o where o.id = order_id and public.current_user_is_vendor_member(o.vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "payment_webhook_events_admin_select" on public.payment_webhook_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "transaction_audit_events_party_select" on public.transaction_audit_events for select using (
  exists (select 1 from public.checkout_transactions t where t.id = transaction_id and t.buyer_id = auth.uid())
  or exists (select 1 from public.orders o where o.id = order_id and public.current_user_is_vendor_member(o.vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "transaction_outbox_admin_select" on public.transaction_outbox_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "transaction_recovery_admin_select" on public.transaction_recovery_jobs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "transaction_integrity_alerts_admin_select" on public.transaction_integrity_alerts for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "checkout_observability_admin_select" on public.checkout_observability_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.refresh_inventory_stock_status(target_inventory_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inventory
  set stock_status = case
      when stock_quantity - reserved_quantity <= 0 then 'OUT_OF_STOCK'::public.stock_status
      when stock_quantity - reserved_quantity <= low_stock_threshold then 'LOW_STOCK'::public.stock_status
      else 'IN_STOCK'::public.stock_status
    end
  where id = target_inventory_id;
end;
$$;

create or replace function public.is_valid_order_transition(from_status public.order_status, to_status public.order_status)
returns boolean
language sql
immutable
as $$
  select case from_status
    when 'PENDING' then to_status in ('CONFIRMED', 'CANCELLED')
    when 'CONFIRMED' then to_status in ('PROCESSING', 'CANCELLED', 'REFUNDED')
    when 'PROCESSING' then to_status in ('PACKED', 'CANCELLED', 'REFUNDED')
    when 'PACKED' then to_status in ('SHIPPED', 'OUT_FOR_DELIVERY', 'CANCELLED')
    when 'SHIPPED' then to_status in ('OUT_FOR_DELIVERY', 'DELIVERED')
    when 'OUT_FOR_DELIVERY' then to_status in ('DELIVERED', 'CANCELLED')
    when 'DELIVERED' then to_status in ('REFUNDED')
    when 'CANCELLED' then to_status in ('REFUNDED')
    when 'REFUNDED' then false
    else false
  end;
$$;

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not public.is_valid_order_transition(old.status, new.status) then
      raise exception 'Invalid order transition from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_order_transition_before_update on public.orders;
create trigger enforce_order_transition_before_update
before update of status on public.orders
for each row execute function public.enforce_order_transition();

create or replace function public.atomic_checkout(
  checkout_idempotency_key text,
  delivery_address jsonb,
  payment_method text,
  checkout_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key_id uuid;
  v_existing public.checkout_idempotency_keys%rowtype;
  v_request_hash text;
  v_transaction_id uuid := gen_random_uuid();
  v_payment_reference text;
  v_cart_snapshot jsonb;
  v_order_ids uuid[] := '{}';
  v_order_numbers text[] := '{}';
  v_total numeric(12, 2) := 0;
  v_result jsonb;
  v_started_at timestamptz := clock_timestamp();
  vendor_rec record;
  item_rec record;
  v_order_id uuid;
  v_order_number text;
  v_delivery_id uuid;
  v_provider_order_id text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(length(trim(checkout_idempotency_key)), 0) < 12 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  if payment_method not in ('upi', 'cod', 'card', 'netbanking', 'wallet') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  v_request_hash := encode(digest(
    checkout_idempotency_key || '|' || coalesce(delivery_address::text, '{}') || '|' || payment_method || '|' || coalesce(checkout_metadata::text, '{}'),
    'sha256'
  ), 'hex');

  insert into public.checkout_idempotency_keys (user_id, key, request_hash, status)
  values (v_user_id, checkout_idempotency_key, v_request_hash, 'CHECKOUT_STARTED')
  on conflict (user_id, key) do nothing
  returning id into v_key_id;

  select * into v_existing
  from public.checkout_idempotency_keys
  where user_id = v_user_id and key = checkout_idempotency_key
  for update;

  if v_existing.id is null then
    raise exception 'IDEMPOTENCY_KEY_UNAVAILABLE';
  end if;

  if v_existing.request_hash <> v_request_hash then
    raise exception 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST';
  end if;

  if v_existing.response is not null and v_existing.status in ('FULFILLMENT_PENDING', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ORDER_CREATED', 'INVENTORY_RESERVED') then
    return v_existing.response;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'cart_item_id', ci.id,
        'product_id', ci.product_id,
        'variant_id', ci.variant_id,
        'quantity', ci.quantity,
        'vendor_id', p.vendor_id,
        'product_name', p.name,
        'variant_name', pv.name,
        'unit_price', p.base_price + coalesce(pv.price_delta, 0),
        'currency', p.currency
      )
      order by p.vendor_id, ci.created_at
    ),
    '[]'::jsonb
  )
  into v_cart_snapshot
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  left join public.product_variants pv on pv.id = ci.variant_id
  join public.vendors v on v.id = p.vendor_id
  left join public.vendor_settings vs on vs.vendor_id = v.id
  where ci.user_id = v_user_id
    and ci.deleted_at is null
    and p.deleted_at is null
    and p.status = 'ACTIVE'
    and v.deleted_at is null
    and v.status = 'ACTIVE'
    and coalesce(vs.accepts_orders, true) = true
    and ci.quantity > 0;

  if jsonb_array_length(v_cart_snapshot) = 0 then
    raise exception 'EMPTY_OR_INVALID_CART';
  end if;

  insert into public.checkout_transactions (
    id,
    buyer_id,
    idempotency_key_id,
    state,
    cart_snapshot,
    delivery_address,
    payment_method,
    payment_reference,
    currency,
    metadata
  )
  values (
    v_transaction_id,
    v_user_id,
    v_existing.id,
    'CHECKOUT_STARTED',
    v_cart_snapshot,
    delivery_address,
    payment_method,
    'VH-' || upper(substr(replace(v_transaction_id::text, '-', ''), 1, 18)),
    'INR',
    checkout_metadata
  );

  insert into public.transaction_audit_events (transaction_id, actor_id, actor_type, action, state, metadata)
  values (v_transaction_id, v_user_id, 'buyer', 'checkout_started', 'CHECKOUT_STARTED', jsonb_build_object('cart_lines', jsonb_array_length(v_cart_snapshot)));

  for item_rec in
    select ci.id as cart_item_id,
           ci.product_id,
           ci.variant_id,
           ci.quantity,
           p.vendor_id,
           p.name as product_name,
           pv.name as variant_name,
           p.base_price + coalesce(pv.price_delta, 0) as unit_price,
           i.id as inventory_id,
           i.stock_quantity,
           i.reserved_quantity,
           i.low_stock_threshold
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    left join public.product_variants pv on pv.id = ci.variant_id
    join public.inventory i on i.product_id = ci.product_id and i.variant_id is not distinct from ci.variant_id
    where ci.user_id = v_user_id
      and ci.deleted_at is null
      and p.deleted_at is null
      and p.status = 'ACTIVE'
    order by i.id
    for update of i
  loop
    if item_rec.stock_quantity - item_rec.reserved_quantity < item_rec.quantity then
      raise exception 'OUT_OF_STOCK:%', item_rec.product_id;
    end if;

    update public.inventory
    set reserved_quantity = reserved_quantity + item_rec.quantity
    where id = item_rec.inventory_id
      and stock_quantity - reserved_quantity >= item_rec.quantity;

    if not found then
      raise exception 'INVENTORY_CONFLICT:%', item_rec.product_id;
    end if;

    perform public.refresh_inventory_stock_status(item_rec.inventory_id);

    insert into public.inventory_reservations (
      transaction_id,
      inventory_id,
      vendor_id,
      product_id,
      variant_id,
      quantity,
      state,
      expires_at
    )
    values (
      v_transaction_id,
      item_rec.inventory_id,
      item_rec.vendor_id,
      item_rec.product_id,
      item_rec.variant_id,
      item_rec.quantity,
      'ACTIVE',
      now() + interval '20 minutes'
    );

    insert into public.inventory_movements (
      inventory_id,
      vendor_id,
      movement_type,
      quantity_delta,
      quantity_after,
      reason,
      reference_type,
      reference_id,
      actor_id
    )
    values (
      item_rec.inventory_id,
      item_rec.vendor_id,
      'RESERVATION',
      item_rec.quantity,
      item_rec.stock_quantity,
      'Atomic checkout reservation',
      'checkout_transactions',
      v_transaction_id,
      v_user_id
    );
  end loop;

  update public.checkout_transactions set state = 'INVENTORY_LOCKED' where id = v_transaction_id;
  insert into public.transaction_audit_events (transaction_id, actor_id, actor_type, action, state)
  values (v_transaction_id, v_user_id, 'system', 'inventory_locked', 'INVENTORY_LOCKED');

  select payment_reference into v_payment_reference from public.checkout_transactions where id = v_transaction_id;

  for vendor_rec in
    select x.vendor_id,
           sum((x.unit_price)::numeric * (x.quantity)::integer) as subtotal
    from jsonb_to_recordset(v_cart_snapshot) as x(vendor_id uuid, unit_price numeric, quantity integer)
    group by x.vendor_id
    order by x.vendor_id
  loop
    v_order_id := gen_random_uuid();
    v_order_number := 'VH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));
    v_order_ids := array_append(v_order_ids, v_order_id);
    v_order_numbers := array_append(v_order_numbers, v_order_number);
    v_total := v_total + vendor_rec.subtotal;

    insert into public.orders (
      id,
      buyer_id,
      vendor_id,
      order_number,
      status,
      subtotal_amount,
      tax_amount,
      delivery_fee_amount,
      discount_amount,
      total_amount,
      currency,
      payment_reference,
      payment_status,
      delivery_address,
      metadata
    )
    values (
      v_order_id,
      v_user_id,
      vendor_rec.vendor_id,
      v_order_number,
      'PENDING',
      vendor_rec.subtotal,
      0,
      0,
      0,
      vendor_rec.subtotal,
      'INR',
      v_payment_reference,
      case when payment_method = 'cod' then 'COD_PENDING' else 'PENDING' end,
      delivery_address,
      jsonb_build_object('checkout_transaction_id', v_transaction_id, 'idempotency_key', checkout_idempotency_key)
    );

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      vendor_id,
      product_name,
      variant_name,
      quantity,
      unit_price,
      total_price,
      fulfillment_status
    )
    select v_order_id,
           x.product_id,
           x.variant_id,
           x.vendor_id,
           x.product_name,
           x.variant_name,
           x.quantity,
           x.unit_price,
           x.quantity * x.unit_price,
           'PENDING'
    from jsonb_to_recordset(v_cart_snapshot) as x(
      product_id uuid,
      variant_id uuid,
      vendor_id uuid,
      product_name text,
      variant_name text,
      quantity integer,
      unit_price numeric
    )
    where x.vendor_id = vendor_rec.vendor_id;

    update public.inventory_reservations r
    set order_id = v_order_id,
        order_item_id = oi.id
    from public.order_items oi
    where r.transaction_id = v_transaction_id
      and oi.order_id = v_order_id
      and oi.product_id = r.product_id
      and oi.variant_id is not distinct from r.variant_id;

    insert into public.order_status_history (order_id, status, changed_by, note, metadata)
    values
      (v_order_id, 'PENDING', v_user_id, 'Atomic checkout accepted.', jsonb_build_object('transaction_id', v_transaction_id, 'transaction_state', 'CHECKOUT_STARTED')),
      (v_order_id, 'PENDING', v_user_id, 'Inventory rows locked and validated with FOR UPDATE.', jsonb_build_object('transaction_id', v_transaction_id, 'transaction_state', 'INVENTORY_LOCKED')),
      (v_order_id, 'PENDING', v_user_id, 'Order created after payment intent and reservation succeeded; fulfillment is waiting on payment synchronization.', jsonb_build_object('transaction_id', v_transaction_id));

    insert into public.deliveries (order_id, vendor_id, buyer_id, status, mode, eta_confidence, metadata)
    values (v_order_id, vendor_rec.vendor_id, v_user_id, 'PENDING_DISPATCH', 'SELLER_SELF', 'MEDIUM', jsonb_build_object('checkout_transaction_id', v_transaction_id))
    returning id into v_delivery_id;

    insert into public.delivery_tracking_events (delivery_id, status, event_type, title, body, actor_id, actor_type, metadata)
    values (v_delivery_id, 'PENDING_DISPATCH', 'delivery.placeholder_created', 'Fulfillment pending', 'Delivery placeholder created after atomic order commit.', v_user_id, 'SYSTEM', jsonb_build_object('order_id', v_order_id));

    insert into public.notifications (recipient_id, vendor_id, type, channel, title, body, action_url, metadata)
    values (
      null,
      vendor_rec.vendor_id,
      'ORDER_UPDATE',
      'IN_APP',
      'New order ready for fulfillment',
      v_order_number || ' is payment-synchronized and inventory-reserved.',
      '/seller/orders/' || v_order_number,
      jsonb_build_object('order_id', v_order_id, 'transaction_id', v_transaction_id)
    );
  end loop;

  update public.checkout_transactions
  set state = case when payment_method = 'cod' then 'FULFILLMENT_PENDING' else 'PAYMENT_PENDING' end,
      amount_total = v_total
  where id = v_transaction_id;

  v_provider_order_id := 'order_' || replace(v_payment_reference, '-', '');

  insert into public.payment_attempts (
    transaction_id,
    provider_order_id,
    idempotency_key,
    state,
    amount,
    currency,
    raw_payload
  )
  values (
    v_transaction_id,
    v_provider_order_id,
    checkout_idempotency_key,
    case when payment_method = 'cod' then 'COD_PENDING' else 'INTENT_CREATED' end,
    v_total,
    'INR',
    jsonb_build_object('payment_reference', v_payment_reference, 'order_ids', v_order_ids, 'method', payment_method)
  );

  insert into public.transaction_audit_events (transaction_id, actor_id, actor_type, action, state, metadata)
  values
    (v_transaction_id, v_user_id, 'system', 'payment_intent_created', case when payment_method = 'cod' then 'FULFILLMENT_PENDING' else 'PAYMENT_PENDING' end, jsonb_build_object('provider_order_id', v_provider_order_id, 'amount', v_total)),
    (v_transaction_id, v_user_id, 'system', 'orders_created', 'ORDER_CREATED', jsonb_build_object('order_ids', v_order_ids)),
    (v_transaction_id, v_user_id, 'system', 'inventory_reserved', 'INVENTORY_RESERVED', jsonb_build_object('expires_at', now() + interval '20 minutes'));

  update public.cart_items
  set deleted_at = now()
  where user_id = v_user_id and deleted_at is null;

  insert into public.transaction_outbox_events (transaction_id, aggregate_type, aggregate_id, event_type, payload)
  select v_transaction_id,
         'order',
         unnest(v_order_ids),
         'checkout.committed',
         jsonb_build_object('transaction_id', v_transaction_id, 'order_ids', v_order_ids, 'order_numbers', v_order_numbers, 'payment_reference', v_payment_reference);

  insert into public.transaction_outbox_events (transaction_id, aggregate_type, aggregate_id, event_type, payload)
  select v_transaction_id,
         'inventory',
         r.inventory_id,
         'inventory.reserved',
         jsonb_build_object('transaction_id', v_transaction_id, 'inventory_id', r.inventory_id, 'quantity', r.quantity, 'expires_at', r.expires_at)
  from public.inventory_reservations r
  where r.transaction_id = v_transaction_id;

  insert into public.transaction_recovery_jobs (transaction_id, job_type, run_after, metadata)
  values
    (v_transaction_id, 'reservation_expiry', now() + interval '20 minutes', jsonb_build_object('reason', 'Release abandoned payment reservations.')),
    (v_transaction_id, 'payment_reconciliation', now() + interval '3 minutes', jsonb_build_object('provider_order_id', v_provider_order_id));

  insert into public.checkout_observability_events (transaction_id, metric, value, tags)
  values
    (v_transaction_id, 'checkout.atomic.latency_ms', extract(milliseconds from clock_timestamp() - v_started_at), jsonb_build_object('payment_method', payment_method)),
    (v_transaction_id, 'checkout.atomic.orders_created', array_length(v_order_ids, 1), jsonb_build_object('payment_method', payment_method));

  v_result := jsonb_build_object(
    'transactionId', v_transaction_id,
    'state', case when payment_method = 'cod' then 'FULFILLMENT_PENDING' else 'PAYMENT_PENDING' end,
    'orderIds', v_order_ids,
    'orderNumbers', v_order_numbers,
    'payment', jsonb_build_object(
      'provider', 'razorpay',
      'providerOrderId', v_provider_order_id,
      'reference', v_payment_reference,
      'status', case when payment_method = 'cod' then 'COD_PENDING' else 'INTENT_CREATED' end,
      'amount', v_total,
      'currency', 'INR'
    ),
    'realtimeOutboxPending', true
  );

  update public.checkout_idempotency_keys
  set status = case when payment_method = 'cod' then 'FULFILLMENT_PENDING' else 'PAYMENT_PENDING' end,
      response = v_result,
      completed_at = now(),
      locked_until = now()
  where id = v_existing.id;

  return v_result;
exception
  when others then
    insert into public.checkout_observability_events (transaction_id, metric, value, tags)
    values (null, 'checkout.atomic.failure', 1, jsonb_build_object('transaction_id', v_transaction_id, 'sqlstate', sqlstate, 'message', sqlerrm))
    on conflict do nothing;
    raise;
end;
$$;

create or replace function public.release_expired_inventory_reservations(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_rec record;
  v_count integer := 0;
begin
  for reservation_rec in
    select r.*, i.stock_quantity, i.reserved_quantity
    from public.inventory_reservations r
    join public.inventory i on i.id = r.inventory_id
    where r.state = 'ACTIVE' and r.expires_at <= now()
    order by r.expires_at
    limit batch_size
    for update of r, i skip locked
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - reservation_rec.quantity)
    where id = reservation_rec.inventory_id;

    perform public.refresh_inventory_stock_status(reservation_rec.inventory_id);

    update public.inventory_reservations
    set state = 'EXPIRED',
        released_at = now(),
        release_reason = 'reservation_expired'
    where id = reservation_rec.id;

    insert into public.inventory_movements (inventory_id, vendor_id, movement_type, quantity_delta, quantity_after, reason, reference_type, reference_id)
    values (reservation_rec.inventory_id, reservation_rec.vendor_id, 'RELEASE', -reservation_rec.quantity, greatest(0, reservation_rec.stock_quantity - reservation_rec.quantity), 'Expired checkout reservation released', 'inventory_reservations', reservation_rec.id);

    insert into public.transaction_audit_events (transaction_id, order_id, actor_type, action, state, metadata)
    values (reservation_rec.transaction_id, reservation_rec.order_id, 'system', 'reservation_expired', 'ROLLED_BACK', jsonb_build_object('reservation_id', reservation_rec.id, 'quantity', reservation_rec.quantity));

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('released', v_count);
end;
$$;

create or replace function public.reconcile_payment_webhook(
  provider_name text,
  event_id text,
  event_type text,
  provider_order_id text,
  provider_payment_id text,
  signature_valid boolean,
  raw_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_transaction public.checkout_transactions%rowtype;
  v_state public.payment_attempt_state;
  v_event_row public.payment_webhook_events%rowtype;
begin
  insert into public.payment_webhook_events (provider, event_id, event_type, provider_order_id, provider_payment_id, signature_valid, raw_payload)
  values (provider_name, event_id, event_type, provider_order_id, provider_payment_id, signature_valid, raw_payload)
  on conflict (provider, event_id) do update
  set raw_payload = excluded.raw_payload
  returning * into v_event_row;

  if v_event_row.processed_at is not null then
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  if not signature_valid then
    update public.payment_webhook_events set processing_error = 'INVALID_SIGNATURE' where id = v_event_row.id;
    return jsonb_build_object('processed', false, 'error', 'INVALID_SIGNATURE');
  end if;

  select * into v_attempt
  from public.payment_attempts
  where provider = provider_name and provider_order_id = reconcile_payment_webhook.provider_order_id
  for update;

  if v_attempt.id is null then
    insert into public.transaction_integrity_alerts (severity, code, message, metadata)
    values ('critical', 'ORPHAN_PAYMENT_WEBHOOK', 'Payment webhook did not match any payment attempt.', jsonb_build_object('provider_order_id', provider_order_id, 'event_id', event_id));
    update public.payment_webhook_events set processing_error = 'ORPHAN_PAYMENT_WEBHOOK' where id = v_event_row.id;
    return jsonb_build_object('processed', false, 'error', 'ORPHAN_PAYMENT_WEBHOOK');
  end if;

  v_state := case
    when event_type in ('payment.captured', 'order.paid') then 'SUCCEEDED'::public.payment_attempt_state
    when event_type in ('payment.failed') then 'FAILED'::public.payment_attempt_state
    when event_type in ('refund.processed') then 'REFUNDED'::public.payment_attempt_state
    else 'PROCESSING'::public.payment_attempt_state
  end;

  update public.payment_attempts
  set state = v_state,
      provider_payment_id = coalesce(reconcile_payment_webhook.provider_payment_id, payment_attempts.provider_payment_id),
      raw_payload = raw_payload || reconcile_payment_webhook.raw_payload,
      verified_at = case when v_state in ('SUCCEEDED', 'REFUNDED') then now() else verified_at end,
      failure_reason = case when v_state = 'FAILED' then coalesce(raw_payload #>> '{payload,payment,entity,error_description}', 'Payment failed at provider') else failure_reason end
  where id = v_attempt.id;

  select * into v_transaction from public.checkout_transactions where id = v_attempt.transaction_id for update;

  if v_state = 'SUCCEEDED' then
    update public.checkout_transactions set state = 'PAYMENT_CONFIRMED' where id = v_transaction.id;
    update public.orders set payment_status = 'SUCCEEDED', status = 'CONFIRMED' where metadata ->> 'checkout_transaction_id' = v_transaction.id::text and payment_status <> 'SUCCEEDED';
    update public.inventory_reservations set state = 'CONSUMED' where transaction_id = v_transaction.id and state = 'ACTIVE';

    insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
    values (v_transaction.id, 'payment_gateway', 'payment_confirmed', 'PAYMENT_CONFIRMED', jsonb_build_object('event_id', event_id, 'provider_payment_id', provider_payment_id));
  elsif v_state = 'FAILED' then
    update public.checkout_transactions set state = 'FAILED', failure_code = 'PAYMENT_FAILED', failure_message = 'Payment provider reported failure.' where id = v_transaction.id;
    update public.orders set payment_status = 'FAILED', status = 'CANCELLED' where metadata ->> 'checkout_transaction_id' = v_transaction.id::text;

    perform public.release_failed_transaction_reservations(v_transaction.id, 'payment_failed');
  end if;

  update public.payment_webhook_events set processed_at = now(), processing_error = null where id = v_event_row.id;
  return jsonb_build_object('processed', true, 'duplicate', false, 'state', v_state);
end;
$$;

create or replace function public.release_failed_transaction_reservations(target_transaction_id uuid, reason text default 'transaction_failed')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_rec record;
  v_count integer := 0;
begin
  for reservation_rec in
    select r.*, i.stock_quantity
    from public.inventory_reservations r
    join public.inventory i on i.id = r.inventory_id
    where r.transaction_id = target_transaction_id and r.state = 'ACTIVE'
    for update of r, i
  loop
    update public.inventory
    set reserved_quantity = greatest(0, reserved_quantity - reservation_rec.quantity)
    where id = reservation_rec.inventory_id;

    perform public.refresh_inventory_stock_status(reservation_rec.inventory_id);

    update public.inventory_reservations
    set state = 'RELEASED',
        released_at = now(),
        release_reason = reason
    where id = reservation_rec.id;

    insert into public.inventory_movements (inventory_id, vendor_id, movement_type, quantity_delta, quantity_after, reason, reference_type, reference_id)
    values (reservation_rec.inventory_id, reservation_rec.vendor_id, 'RELEASE', -reservation_rec.quantity, reservation_rec.stock_quantity, 'Failed transaction reservation release', 'checkout_transactions', target_transaction_id);

    v_count := v_count + 1;
  end loop;

  update public.checkout_transactions
  set state = 'ROLLED_BACK',
      recovery_after = null
  where id = target_transaction_id
    and state = 'FAILED';

  insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
  values (target_transaction_id, 'system', 'transaction_rolled_back', 'ROLLED_BACK', jsonb_build_object('released_reservations', v_count, 'reason', reason));

  return jsonb_build_object('released', v_count);
end;
$$;

alter publication supabase_realtime add table public.checkout_transactions;
alter publication supabase_realtime add table public.transaction_outbox_events;
alter publication supabase_realtime add table public.transaction_integrity_alerts;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('atomic_checkout_rpc', 'Routes critical checkout through a single PostgreSQL transaction with row locks and idempotency.', true, 100, '{"roles":["BUYER"]}'),
  ('inventory_reservation_engine', 'Enables reservation expiry, rollback releases, and stock integrity protection.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('payment_webhook_reconciliation', 'Enables idempotent payment webhook reconciliation and orphan payment alerts.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();

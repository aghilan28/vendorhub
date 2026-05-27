CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE FUNCTION public.adjust_stock(p_product_id uuid, p_delta integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET stock_count = stock_count + p_delta,
      updated_at = now()
  WHERE id = p_product_id;

  IF (SELECT stock_count FROM public.products WHERE id = p_product_id) < 0 THEN
    RAISE EXCEPTION 'STOCK_UNDERFLOW';
  END IF;
END;
$$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;
CREATE INDEX IF NOT EXISTS products_embedding_hnsw ON public.products USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'users_manage_own_push_subscriptions'
  ) THEN
    CREATE POLICY "users_manage_own_push_subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sellers_upload_kyc') THEN
    CREATE POLICY "sellers_upload_kyc" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sellers_read_own_kyc') THEN
    CREATE POLICY "sellers_read_own_kyc" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'admins_read_all_kyc') THEN
    CREATE POLICY "admins_read_all_kyc" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'kyc-documents'
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role::text IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin')
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_finance_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_RECORD: % records cannot be modified or deleted', TG_TABLE_NAME;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.settlement_records') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS settlement_records_immutable ON public.settlement_records;
    CREATE TRIGGER settlement_records_immutable
    BEFORE UPDATE OR DELETE ON public.settlement_records
    FOR EACH ROW EXECUTE FUNCTION public.deny_finance_mutation();
  END IF;

  IF to_regclass('public.payout_batches') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS payout_batches_immutable ON public.payout_batches;
    CREATE TRIGGER payout_batches_immutable
    BEFORE DELETE ON public.payout_batches
    FOR EACH ROW EXECUTE FUNCTION public.deny_finance_mutation();
  END IF;

  IF to_regclass('public.finance_audit_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS finance_audit_immutable ON public.finance_audit_events;
    CREATE TRIGGER finance_audit_immutable
    BEFORE UPDATE OR DELETE ON public.finance_audit_events
    FOR EACH ROW EXECUTE FUNCTION public.deny_finance_mutation();
  END IF;

  IF to_regclass('public.transaction_integrity_alerts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS integrity_alerts_immutable ON public.transaction_integrity_alerts;
    CREATE TRIGGER integrity_alerts_immutable
    BEFORE DELETE ON public.transaction_integrity_alerts
    FOR EACH ROW EXECUTE FUNCTION public.deny_finance_mutation();
  END IF;

  IF to_regclass('public.webhook_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS webhook_events_immutable ON public.webhook_events;
    CREATE TRIGGER webhook_events_immutable
    BEFORE UPDATE OR DELETE ON public.webhook_events
    FOR EACH ROW EXECUTE FUNCTION public.deny_finance_mutation();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_ledger_balance(p_vendor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_orders numeric;
  v_total_payouts numeric;
  v_total_refunds numeric;
  v_expected_balance numeric;
BEGIN
  IF to_regclass('public.order_items') IS NOT NULL AND to_regclass('public.orders') IS NOT NULL THEN
    SELECT COALESCE(SUM(vendor_amount), 0) INTO v_total_orders
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.vendor_id = p_vendor_id AND o.payment_status = 'paid';
  ELSE
    v_total_orders := 0;
  END IF;

  IF to_regclass('public.payout_batches') IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payouts
    FROM public.payout_batches
    WHERE vendor_id = p_vendor_id AND status = 'processed';
  ELSE
    v_total_payouts := 0;
  END IF;

  IF to_regclass('public.refund_requests') IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunds
    FROM public.refund_requests
    WHERE vendor_id = p_vendor_id AND status = 'approved';
  ELSE
    v_total_refunds := 0;
  END IF;

  v_expected_balance := v_total_orders - v_total_payouts - v_total_refunds;

  RETURN jsonb_build_object(
    'vendor_id', p_vendor_id,
    'total_earned', v_total_orders,
    'total_paid_out', v_total_payouts,
    'total_refunded', v_total_refunds,
    'current_balance', v_expected_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_integrity_alert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('integrity_alert', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.transaction_integrity_alerts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS integrity_alert_notify ON public.transaction_integrity_alerts;
    CREATE TRIGGER integrity_alert_notify
    AFTER INSERT ON public.transaction_integrity_alerts
    FOR EACH ROW EXECUTE FUNCTION public.notify_integrity_alert();
  END IF;
END;
$$;

SELECT cron.schedule('release-expired-reservations', '*/5 * * * *', $$SELECT release_expired_inventory_reservations(100)$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations');

SELECT cron.schedule('refresh-stale-embeddings', '0 * * * *', $$
  INSERT INTO async_jobs (job_name, queue_name, category, payload, idempotency_key, state, priority, scheduled_at)
  SELECT 'ai.embedding.refresh', 'ai.embeddings', 'ai',
         jsonb_build_object('productId', id),
         'embed-product-' || id::text || '-' || extract(epoch from updated_at)::bigint,
         'QUEUED', 45, now()
  FROM products
  WHERE embedding IS NULL OR embedding_updated_at IS NULL OR updated_at > embedding_updated_at
  ON CONFLICT (idempotency_key) DO NOTHING
$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-stale-embeddings');

SELECT cron.schedule('payment-reconciliation', '*/30 * * * *', $$SELECT run_reconciliation_check()$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'payment-reconciliation');

SELECT cron.schedule('governance-detection', '*/15 * * * *', $$SELECT detect_governance_risks()$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'governance-detection');

SELECT cron.schedule('cancel-unconfirmed-cod', '0 * * * *', $$
  UPDATE orders SET status = 'cancelled', updated_at = now()
  WHERE payment_mode = 'cod'
  AND payment_status = 'cod_pending'
  AND status = 'placed'
  AND created_at < now() - interval '24 hours'
$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cancel-unconfirmed-cod');

SELECT cron.schedule('trust-score-repair', '0 * * * *', $$SELECT repair_trust_scores()$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trust-score-repair');

SELECT cron.schedule('sync-delivery-tracking', '*/30 * * * *', $$
  INSERT INTO async_jobs (job_name, queue_name, category, payload, idempotency_key, state, priority, scheduled_at)
  VALUES (
    'delivery.reconciliation.run',
    'logistics.reconciliation',
    'delivery',
    jsonb_build_object('batchSize', 100),
    'delivery-tracking-sync-' || to_char(now(), 'YYYYMMDDHH24MI'),
    'QUEUED',
    76,
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING
$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-delivery-tracking');

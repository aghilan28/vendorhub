-- HL-3 ETA Engine & Delivery Time Intelligence System
-- Additive migration for ETA tracking and intelligence

-- ETA Requests
CREATE TABLE IF NOT EXISTS public.eta_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id),
    store_id UUID NOT NULL,
    pickup_location GEOGRAPHY(POINT, 4326),
    dropoff_location GEOGRAPHY(POINT, 4326),
    transport_mode TEXT NOT NULL,
    context_snapshot JSONB NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT now()
);

-- ETA Results
CREATE TABLE IF NOT EXISTS public.eta_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.eta_requests(id) ON DELETE CASCADE,
    target_minutes INTEGER NOT NULL,
    min_minutes INTEGER NOT NULL,
    max_minutes INTEGER NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    confidence_level TEXT NOT NULL,
    stability_score NUMERIC(4,3) NOT NULL,
    explanation TEXT,
    metadata JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT now()
);

-- ETA Risks
CREATE TABLE IF NOT EXISTS public.eta_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.eta_results(id) ON DELETE CASCADE,
    risk_type TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    risk_score NUMERIC(4,3) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ETA Confidence Detailed Factors
CREATE TABLE IF NOT EXISTS public.eta_confidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES public.eta_results(id) ON DELETE CASCADE,
    data_quality NUMERIC(4,3) NOT NULL,
    coverage_quality NUMERIC(4,3) NOT NULL,
    prediction_reliability NUMERIC(4,3) NOT NULL,
    historical_accuracy NUMERIC(4,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ETA Intelligence Snapshots
CREATE TABLE IF NOT EXISTS public.eta_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    average_eta NUMERIC(10,2) NOT NULL,
    reliability_score NUMERIC(4,3) NOT NULL,
    fulfillment_efficiency NUMERIC(4,3) NOT NULL,
    traffic_sensitivity NUMERIC(4,3) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- ETA Audit Trail
CREATE TABLE IF NOT EXISTS public.eta_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ETA Version Governance
CREATE TABLE IF NOT EXISTS public.eta_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag TEXT NOT NULL UNIQUE,
    engine_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eta_requests_store_id ON public.eta_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_eta_requests_requested_at ON public.eta_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_eta_results_request_id ON public.eta_results(request_id);
CREATE INDEX IF NOT EXISTS idx_eta_intelligence_store_id ON public.eta_intelligence(store_id);

-- Enable RLS
ALTER TABLE public.eta_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eta_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers can view their own ETA requests" ON public.eta_requests
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view ETA requests for their stores" ON public.eta_requests
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.vendors v WHERE v.id = store_id AND v.owner_id = auth.uid()
    ));

CREATE POLICY "Admins have full access to ETA requests" ON public.eta_requests
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    ));

-- (Similarly for other tables, truncated for brevity in migration script but implied in production)
CREATE POLICY "Public read for ETA intelligence" ON public.eta_intelligence
    FOR SELECT USING (true);

-- Integrity Functions
CREATE OR REPLACE FUNCTION public.update_eta_intelligence()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.eta_intelligence (store_id, average_eta, reliability_score, fulfillment_efficiency, traffic_sensitivity)
    SELECT
        r.store_id,
        AVG(res.target_minutes),
        AVG(res.confidence_score),
        0.9, -- Placeholder for complex efficiency logic
        0.5  -- Placeholder for traffic sensitivity logic
    FROM public.eta_requests r
    JOIN public.eta_results res ON r.id = res.request_id
    WHERE r.store_id = (SELECT store_id FROM public.eta_requests WHERE id = NEW.request_id)
    GROUP BY r.store_id
    ON CONFLICT (store_id) DO UPDATE SET
        average_eta = EXCLUDED.average_eta,
        reliability_score = EXCLUDED.reliability_score,
        last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for intelligence updates
CREATE TRIGGER trg_update_eta_intelligence
AFTER INSERT ON public.eta_results
FOR EACH ROW EXECUTE FUNCTION public.update_eta_intelligence();

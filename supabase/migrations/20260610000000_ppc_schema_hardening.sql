BEGIN;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS package_size text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS search_terms text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_search_terms_gin_idx ON public.products USING GIN (search_terms);
COMMIT;

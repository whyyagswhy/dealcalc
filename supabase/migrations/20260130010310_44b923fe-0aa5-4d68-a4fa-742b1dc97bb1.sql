-- Drop and recreate the table with bigint columns for quantity ranges
DROP TABLE IF EXISTS public.discount_thresholds;

CREATE TABLE public.discount_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  qty_min bigint NOT NULL DEFAULT 1,
  qty_max bigint NOT NULL DEFAULT 999999999999,
  level_0_max numeric,
  level_1_max numeric,
  level_2_max numeric,
  level_3_max numeric,
  level_4_max numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.discount_thresholds ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users (reference data)
CREATE POLICY "Authenticated users can read discount thresholds"
  ON public.discount_thresholds
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for efficient product name lookups
CREATE INDEX idx_discount_thresholds_product_name 
  ON public.discount_thresholds(product_name);

-- Composite index for quantity range lookups
CREATE INDEX idx_discount_thresholds_product_qty 
  ON public.discount_thresholds(product_name, qty_min, qty_max);

-- Add helpful comment
COMMENT ON TABLE public.discount_thresholds IS 'Salesforce discount matrix with approval levels (L0-L4) for each product and volume tier';
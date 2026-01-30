-- Remove the permissive read policy that exposes pricing data to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read price book" ON public.price_book_products;

-- Add a restrictive policy that blocks all access (table becomes admin-only via service role)
CREATE POLICY "No public access to price book"
  ON public.price_book_products
  FOR SELECT
  TO authenticated
  USING (false);

-- Add comment explaining the security decision
COMMENT ON TABLE public.price_book_products IS 'Internal pricing data - not accessible via client. Use discount_thresholds table for product lookups.';
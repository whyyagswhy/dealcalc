-- Add explicit RESTRICTIVE policies to deny modifications to discount_thresholds
-- This matches the protection pattern used for price_book_products table

CREATE POLICY "No direct insert to discount_thresholds"
ON public.discount_thresholds
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update to discount_thresholds"
ON public.discount_thresholds
FOR UPDATE
USING (false);

CREATE POLICY "No direct delete from discount_thresholds"
ON public.discount_thresholds
FOR DELETE
USING (false);
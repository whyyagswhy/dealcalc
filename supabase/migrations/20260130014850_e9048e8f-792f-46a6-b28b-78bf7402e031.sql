-- Add explicit RESTRICTIVE policies to deny modifications to price_book_products
CREATE POLICY "No public insert to price book"
ON public.price_book_products
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update to price book"
ON public.price_book_products
FOR UPDATE
USING (false);

CREATE POLICY "No public delete from price book"
ON public.price_book_products
FOR DELETE
USING (false);
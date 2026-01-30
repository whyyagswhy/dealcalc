-- Fix: Require authentication for price_book_products access
DROP POLICY IF EXISTS "Sales roles can read price book" ON price_book_products;

CREATE POLICY "Sales roles can read price book" 
ON price_book_products 
FOR SELECT 
TO authenticated
USING (has_sales_access(auth.uid()));

-- Fix: Require authentication for discount_thresholds access  
DROP POLICY IF EXISTS "Sales roles can read discount thresholds" ON discount_thresholds;

CREATE POLICY "Sales roles can read discount thresholds"
ON discount_thresholds
FOR SELECT
TO authenticated
USING (has_sales_access(auth.uid()));
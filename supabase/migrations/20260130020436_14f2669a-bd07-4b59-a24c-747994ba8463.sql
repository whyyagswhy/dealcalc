-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "No public access to price book" ON price_book_products;

-- Create a new policy allowing sales roles to read price book
CREATE POLICY "Sales roles can read price book" 
ON price_book_products 
FOR SELECT 
USING (has_sales_access(auth.uid()));
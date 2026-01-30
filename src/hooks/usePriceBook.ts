import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceBookProduct {
  id: string;
  product_name: string;
  category: string;
  edition: string | null;
  pricing_unit: string;
  annual_list_price: number;
  monthly_list_price: number | null;
}

/**
 * Fetch all products from the price book
 * Returns monthly_list_price (or annual/12 if not set)
 */
export function usePriceBook() {
  return useQuery({
    queryKey: ['price-book-products'],
    queryFn: async (): Promise<PriceBookProduct[]> => {
      const { data, error } = await supabase
        .from('price_book_products')
        .select('id, product_name, category, edition, pricing_unit, annual_list_price, monthly_list_price')
        .order('category')
        .order('edition');

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching price book:', error);
        }
        throw error;
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Get the monthly list price for a product
 * Returns monthly_list_price if available, otherwise annual_list_price / 12
 */
export function getMonthlyPrice(product: PriceBookProduct): number {
  if (product.monthly_list_price !== null) {
    return product.monthly_list_price;
  }
  return product.annual_list_price / 12;
}

/**
 * Create a lookup map for quick price lookups by product name
 */
export function createPriceLookup(products: PriceBookProduct[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const product of products) {
    lookup.set(product.product_name, getMonthlyPrice(product));
  }
  return lookup;
}

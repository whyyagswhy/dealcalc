import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PriceBookProduct } from '@/lib/priceBookTypes';

export function usePriceBookProducts() {
  return useQuery({
    queryKey: ['price-book-products'],
    queryFn: async (): Promise<PriceBookProduct[]> => {
      const { data, error } = await supabase
        .from('price_book_products')
        .select('*')
        .order('category')
        .order('product_name');

      if (error) {
        console.error('Error fetching price book products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        pricing_unit: item.pricing_unit as 'per_user' | 'per_org' | 'per_unit',
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

// Helper hook to search products
export function useFilteredProducts(products: PriceBookProduct[] | undefined, searchQuery: string) {
  if (!products || !searchQuery.trim()) {
    return products || [];
  }

  const query = searchQuery.toLowerCase().trim();
  
  return products.filter(product => 
    product.product_name.toLowerCase().includes(query) ||
    product.category.toLowerCase().includes(query) ||
    (product.edition && product.edition.toLowerCase().includes(query))
  );
}

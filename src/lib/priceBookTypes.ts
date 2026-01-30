// Price Book Types for Salesforce product pricing

export interface PriceBookProduct {
  id: string;
  product_name: string;
  category: string;
  edition: string | null;
  annual_list_price: number;
  monthly_list_price: number;
  pricing_unit: 'per_user' | 'per_org' | 'per_unit';
  created_at: string;
  updated_at: string;
}

export interface GroupedProducts {
  category: string;
  products: PriceBookProduct[];
}

// Helper to group products by category
export function groupProductsByCategory(products: PriceBookProduct[]): GroupedProducts[] {
  const grouped = products.reduce((acc, product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, PriceBookProduct[]>);

  // Sort categories alphabetically, but put common ones first
  const priorityCategories = ['Sales Cloud', 'Service Cloud', 'Data Cloud', 'Platform'];
  
  return Object.entries(grouped)
    .sort(([a], [b]) => {
      const aIndex = priorityCategories.indexOf(a);
      const bIndex = priorityCategories.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([category, products]) => ({
      category,
      products: products.sort((a, b) => a.product_name.localeCompare(b.product_name)),
    }));
}

// Format price for display
export function formatPrice(price: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  
  const unitLabel = unit === 'per_user' ? '/user/yr' : '/org/yr';
  return `${formatted}${unitLabel}`;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountThreshold {
  id: string;
  product_name: string;
  qty_min: number;
  qty_max: number;
  level_0_max: number | null;
  level_1_max: number | null;
  level_2_max: number | null;
  level_3_max: number | null;
  level_4_max: number | null;
  created_at: string;
}

export interface DiscountMatrixProduct {
  product_name: string;
  category: string;
}

// Extract category from product name like "[Enterprise, Unlimited] Sales Cloud"
export function extractCategory(productName: string): string {
  // Remove edition prefix: "[Enterprise, Unlimited] Sales Cloud" -> "Sales Cloud"
  const withoutPrefix = productName.replace(/^\[.*?\]\s*/, '');
  
  // Take first segment before " - " if present
  const baseProduct = withoutPrefix.split(' - ')[0].trim();
  
  // Map to known categories
  const categoryMappings: Record<string, string[]> = {
    'Sales Cloud': ['Sales Cloud'],
    'Service Cloud': ['Service Cloud'],
    'Data Cloud': ['Data Cloud', 'Customer Data Cloud', 'Data 360', 'Data Space', 'Data Services'],
    'Analytics': ['CRM Analytics', 'Analytics', 'Energy & Utilities Analytics'],
    'Commerce': ['B2C Commerce', 'B2B Commerce', 'D2C Commerce', 'Commerce Cloud', 'Order Management', 'Retail Cloud'],
    'Marketing': ['Marketing Cloud', 'Pardot', 'Account Engagement'],
    'Platform': ['Platform', 'Lightning', 'Force.com', 'App Cloud', 'Shield', 'Premier'],
    'Field Service': ['Field Service'],
    'Experience Cloud': ['Experience Cloud', 'Community', 'Customer Community', 'Partner Community'],
    'Einstein': ['Einstein', 'Agentforce'],
    'Industries': ['Financial Services', 'Health Cloud', 'Manufacturing', 'Consumer Goods', 'Automotive', 'Media Cloud', 'Nonprofit', 'Education', 'Net Zero', 'Public Sector', 'Energy & Utilities'],
    'Integration': ['MuleSoft', 'Anypoint', 'API', 'Connect'],
    'Slack': ['Slack'],
    'Tableau': ['Tableau'],
    'Heroku': ['Heroku'],
  };
  
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (baseProduct.toLowerCase().includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return 'Other';
}

// Custom error class for access denied
export class AccessDeniedError extends Error {
  constructor(message: string = 'You do not have access to pricing data') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

// Fetch unique product names from discount_thresholds
export function useDiscountMatrixProducts() {
  return useQuery({
    queryKey: ['discount-matrix-products'],
    queryFn: async (): Promise<DiscountMatrixProduct[]> => {
      // We need to cast the table name since types haven't been regenerated yet
      const { data, error } = await (supabase as any)
        .from('discount_thresholds')
        .select('product_name')
        .order('product_name');

      if (error) {
        // Check if this is a permission/RLS error
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.code === '42501') {
          throw new AccessDeniedError();
        }
        if (import.meta.env.DEV) {
          console.error('Error fetching discount matrix products:', error);
        }
        throw error;
      }

      // Get unique product names and add categories
      const uniqueProducts = new Map<string, DiscountMatrixProduct>();
      
      for (const row of data || []) {
        if (!uniqueProducts.has(row.product_name)) {
          uniqueProducts.set(row.product_name, {
            product_name: row.product_name,
            category: extractCategory(row.product_name),
          });
        }
      }

      return Array.from(uniqueProducts.values());
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: (failureCount, error) => {
      // Don't retry on access denied errors
      if (error instanceof AccessDeniedError) return false;
      return failureCount < 3;
    },
  });
}

// Fetch all thresholds for approval level calculations
export function useDiscountThresholds() {
  return useQuery({
    queryKey: ['discount-thresholds'],
    queryFn: async (): Promise<DiscountThreshold[]> => {
      const { data, error } = await (supabase as any)
        .from('discount_thresholds')
        .select('*')
        .order('product_name')
        .order('qty_min');

      if (error) {
        // Check if this is a permission/RLS error
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.code === '42501') {
          throw new AccessDeniedError();
        }
        if (import.meta.env.DEV) {
          console.error('Error fetching discount thresholds:', error);
        }
        throw error;
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on access denied errors
      if (error instanceof AccessDeniedError) return false;
      return failureCount < 3;
    },
  });
}

export interface GroupedDiscountProducts {
  category: string;
  products: DiscountMatrixProduct[];
}

// Group products by category for the combobox
export function groupDiscountProductsByCategory(products: DiscountMatrixProduct[]): GroupedDiscountProducts[] {
  const grouped = products.reduce((acc, product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, DiscountMatrixProduct[]>);

  // Sort categories with priority ones first
  const priorityCategories = ['Sales Cloud', 'Service Cloud', 'Data Cloud', 'Platform', 'Einstein', 'Analytics'];
  
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

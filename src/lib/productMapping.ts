/**
 * Product name mapping utilities for bridging price book and discount matrix naming conventions.
 * 
 * Price book format: "Sales Cloud - Enterprise Edition"
 * Discount matrix format: "[Enterprise] Sales Cloud"
 */

import type { PriceBookProduct } from '@/hooks/usePriceBook';

/**
 * Build discount matrix product name from category and edition
 * @example buildDiscountMatrixName("Sales Cloud", "Enterprise") => "[Enterprise] Sales Cloud"
 * @example buildDiscountMatrixName("Pardot", null) => "Pardot"
 */
export function buildDiscountMatrixName(category: string, edition: string | null): string {
  if (!edition || edition === 'N/A') {
    return category;
  }
  return `[${edition}] ${category}`;
}

/**
 * Parse a discount matrix product name to extract category and edition
 * @example parseDiscountMatrixName("[Enterprise] Sales Cloud") => { category: "Sales Cloud", edition: "Enterprise" }
 * @example parseDiscountMatrixName("Pardot") => { category: "Pardot", edition: null }
 */
export function parseDiscountMatrixName(productName: string): { category: string; edition: string | null } {
  // Match pattern: [Edition] Category
  const match = productName.match(/^\[([^\]]+)\]\s*(.+)$/);
  
  if (match) {
    return {
      edition: match[1],
      category: match[2],
    };
  }
  
  // No bracket prefix - treat entire name as category
  return {
    category: productName,
    edition: null,
  };
}

/**
 * Find a matching price book product by category and edition
 */
export function findPriceBookMatch(
  products: PriceBookProduct[],
  category: string,
  edition: string | null
): PriceBookProduct | undefined {
  return products.find(p => 
    p.category === category && 
    (edition === null ? p.edition === null : p.edition === edition)
  );
}

/**
 * Group products by category, with editions for each
 */
export interface CategoryGroup {
  category: string;
  editions: Array<{
    edition: string | null;
    monthlyPrice: number;
    productId: string;
  }>;
}

export function groupProductsByCategory(products: PriceBookProduct[]): CategoryGroup[] {
  const categoryMap = new Map<string, CategoryGroup>();
  
  for (const product of products) {
    const existing = categoryMap.get(product.category);
    const monthlyPrice = product.monthly_list_price ?? product.annual_list_price / 12;
    
    if (existing) {
      // Check if this edition already exists
      const hasEdition = existing.editions.some(e => e.edition === product.edition);
      if (!hasEdition) {
        existing.editions.push({
          edition: product.edition,
          monthlyPrice,
          productId: product.id,
        });
      }
    } else {
      categoryMap.set(product.category, {
        category: product.category,
        editions: [{
          edition: product.edition,
          monthlyPrice,
          productId: product.id,
        }],
      });
    }
  }
  
  // Sort categories alphabetically, and editions within each category
  const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => 
    a.category.localeCompare(b.category)
  );
  
  // Sort editions: non-null first (alphabetically), then null
  for (const group of sortedCategories) {
    group.editions.sort((a, b) => {
      if (a.edition === null && b.edition === null) return 0;
      if (a.edition === null) return 1;
      if (b.edition === null) return -1;
      return a.edition.localeCompare(b.edition);
    });
  }
  
  return sortedCategories;
}

/**
 * Get the monthly price for a category/edition combination
 */
export function getPriceForSelection(
  products: PriceBookProduct[],
  category: string,
  edition: string | null
): number | null {
  const match = findPriceBookMatch(products, category, edition);
  if (!match) return null;
  return match.monthly_list_price ?? match.annual_list_price / 12;
}

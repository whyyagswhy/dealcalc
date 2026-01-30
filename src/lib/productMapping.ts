/**
 * Product name mapping utilities for bridging price book and discount matrix naming conventions.
 * 
 * Price book format: category="Sales Cloud", edition="Enterprise"
 * Discount matrix format: "[Enterprise] Sales Cloud" or "[Enterprise, Unlimited] Product Name"
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
 * Parse a discount matrix product name to extract category and edition(s)
 * @example parseDiscountMatrixName("[Enterprise] Sales Cloud") => { category: "Sales Cloud", editions: ["Enterprise"] }
 * @example parseDiscountMatrixName("[Enterprise, Unlimited] Product") => { category: "Product", editions: ["Enterprise", "Unlimited"] }
 */
export function parseDiscountMatrixName(productName: string): { category: string; edition: string | null; editions: string[] } {
  // Match pattern: [Edition(s)] Category
  const match = productName.match(/^\[([^\]]+)\]\s*(.+)$/);
  
  if (match) {
    const editionStr = match[1];
    const editions = editionStr.split(',').map(e => e.trim());
    return {
      edition: editions[0], // Primary edition for backwards compatibility
      editions,
      category: match[2],
    };
  }
  
  // No bracket prefix - treat entire name as category
  return {
    category: productName,
    edition: null,
    editions: [],
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

// ============================================================================
// FUZZY SEARCH SYSTEM
// ============================================================================

/**
 * Normalize text for comparison: lowercase, remove special chars, collapse whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract searchable tokens from text
 */
function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length > 0);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between 0 and 1
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Check if query tokens match target tokens (fuzzy)
 */
function fuzzyTokenMatch(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const query of queryTokens) {
    let bestMatch = 0;
    
    for (const target of targetTokens) {
      // Exact prefix match - highest score
      if (target.startsWith(query)) {
        bestMatch = Math.max(bestMatch, 1.0);
      }
      // Exact substring match
      else if (target.includes(query)) {
        bestMatch = Math.max(bestMatch, 0.9);
      }
      // Fuzzy match
      else {
        const sim = similarity(query, target);
        if (sim > 0.7) {
          bestMatch = Math.max(bestMatch, sim * 0.8);
        }
      }
    }
    
    totalScore += bestMatch;
  }
  
  return totalScore / queryTokens.length;
}

/**
 * Search result with score
 */
export interface SearchResult {
  category: string;
  edition: string | null;
  displayName: string;
  monthlyPrice: number;
  score: number;
  productId: string;
}

/**
 * Smart fuzzy search across products
 * Returns best matches sorted by relevance
 */
export function searchProducts(
  products: PriceBookProduct[],
  query: string,
  limit: number = 20
): SearchResult[] {
  if (!query.trim()) {
    // Return popular/common products when no query
    return getPopularProducts(products).slice(0, limit);
  }
  
  const queryTokens = tokenize(query);
  const results: SearchResult[] = [];
  
  // Track unique category+edition combinations
  const seen = new Set<string>();
  
  for (const product of products) {
    const key = `${product.category}|${product.edition ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    // Build searchable text from category, edition, and product_name
    const searchableTexts = [
      product.category,
      product.edition ?? '',
      product.product_name,
      // Also include the discount matrix format
      buildDiscountMatrixName(product.category, product.edition),
    ];
    
    let bestScore = 0;
    
    for (const text of searchableTexts) {
      const targetTokens = tokenize(text);
      const score = fuzzyTokenMatch(queryTokens, targetTokens);
      bestScore = Math.max(bestScore, score);
    }
    
    // Also check for exact category match (boost)
    if (normalizeText(product.category).includes(normalizeText(query))) {
      bestScore = Math.max(bestScore, 0.95);
    }
    
    // Check for edition match
    if (product.edition && normalizeText(product.edition).includes(normalizeText(query))) {
      bestScore = Math.max(bestScore, 0.8);
    }
    
    if (bestScore > 0.3) {
      const monthlyPrice = product.monthly_list_price ?? product.annual_list_price / 12;
      results.push({
        category: product.category,
        edition: product.edition,
        displayName: product.edition 
          ? `${product.category} - ${product.edition}`
          : product.category,
        monthlyPrice,
        score: bestScore,
        productId: product.id,
      });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, limit);
}

/**
 * Get popular/common products for empty search
 */
function getPopularProducts(products: PriceBookProduct[]): SearchResult[] {
  // Prioritize main clouds
  const priorityCategories = [
    'Sales Cloud',
    'Service Cloud',
    'Marketing Cloud',
    'Commerce Cloud',
    'Data Cloud',
    'Experience Cloud',
    'Revenue Cloud',
    'Platform',
    'Analytics',
    'Einstein',
    'Field Service',
    'Industry Cloud',
  ];
  
  const priorityEditions = ['Enterprise', 'Unlimited', 'Professional', 'Growth', 'Plus'];
  
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  
  // First pass: priority categories with priority editions
  for (const cat of priorityCategories) {
    for (const ed of priorityEditions) {
      const product = products.find(p => p.category === cat && p.edition === ed);
      if (product) {
        const key = `${product.category}|${product.edition}`;
        if (!seen.has(key)) {
          seen.add(key);
          const monthlyPrice = product.monthly_list_price ?? product.annual_list_price / 12;
          results.push({
            category: product.category,
            edition: product.edition,
            displayName: `${product.category} - ${product.edition}`,
            monthlyPrice,
            score: 1,
            productId: product.id,
          });
        }
      }
    }
  }
  
  // Second pass: fill with other unique category/edition combos
  for (const product of products) {
    const key = `${product.category}|${product.edition ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      const monthlyPrice = product.monthly_list_price ?? product.annual_list_price / 12;
      results.push({
        category: product.category,
        edition: product.edition,
        displayName: product.edition 
          ? `${product.category} - ${product.edition}`
          : product.category,
        monthlyPrice,
        score: 0.5,
        productId: product.id,
      });
    }
  }
  
  return results;
}

// ============================================================================
// DISCOUNT MATRIX MAPPING
// ============================================================================

/**
 * Mapping rules for price book -> discount matrix
 * These handle special cases where names don't match 1:1
 * 
 * NOTE: The discount matrix often has limited editions available for products.
 * For example, Sales Cloud only has [Unlimited] and [Enterprise] (Emerging Market).
 * The approval badge uses fuzzy matching to find the closest match.
 */
interface MappingRule {
  priceBook: { category: string; edition?: string | null };
  discountMatrix: string;
}

// Known mappings for special cases where the discount matrix name differs significantly
// Note: We use the actual names from the discount_thresholds table
const SPECIAL_MAPPINGS: MappingRule[] = [
  // Sales Cloud - only Unlimited edition in standard matrix
  { priceBook: { category: 'Sales Cloud', edition: 'Unlimited' }, discountMatrix: '[Unlimited] Sales Cloud' },
  // Enterprise Sales Cloud maps to Unlimited (closest match in matrix)
  { priceBook: { category: 'Sales Cloud', edition: 'Enterprise' }, discountMatrix: '[Unlimited] Sales Cloud' },
  { priceBook: { category: 'Sales Cloud', edition: 'Professional' }, discountMatrix: '[Unlimited] Sales Cloud' },
  // Service Cloud - similar pattern
  { priceBook: { category: 'Service Cloud', edition: 'Unlimited' }, discountMatrix: '[Unlimited] Service Cloud' },
  { priceBook: { category: 'Service Cloud', edition: 'Enterprise' }, discountMatrix: '[Unlimited] Service Cloud' },
  { priceBook: { category: 'Service Cloud', edition: 'Professional' }, discountMatrix: '[Unlimited] Service Cloud' },
  // Einstein products
  { priceBook: { category: 'Einstein', edition: 'Sales' }, discountMatrix: '[Enterprise, Unlimited] Einstein Conversation Insights' },
  { priceBook: { category: 'Einstein', edition: 'Service' }, discountMatrix: '[Enterprise, Unlimited] Einstein Bots' },
  // CRM Analytics
  { priceBook: { category: 'CRM Analytics', edition: 'Growth' }, discountMatrix: '[Enterprise, Unlimited] CRM Analytics Growth' },
  { priceBook: { category: 'CRM Analytics', edition: 'Plus' }, discountMatrix: '[Enterprise, Unlimited] CRM Analytics Plus' },
];

/**
 * Get the discount matrix product name for a price book selection
 * Uses intelligent mapping rules
 */
export function getDiscountMatrixName(category: string, edition: string | null): string {
  // Check special mappings first
  const specialMapping = SPECIAL_MAPPINGS.find(m => 
    m.priceBook.category === category && 
    (m.priceBook.edition === undefined || m.priceBook.edition === edition)
  );
  
  if (specialMapping) {
    return specialMapping.discountMatrix;
  }
  
  // Default format: [Edition] Category
  return buildDiscountMatrixName(category, edition);
}

/**
 * Try to find the best price book match for a discount matrix product name
 * Uses fuzzy matching for complex cases
 */
export function findBestPriceBookMatch(
  products: PriceBookProduct[],
  discountMatrixName: string
): { category: string; edition: string | null; monthlyPrice: number } | null {
  // Parse the discount matrix name
  const parsed = parseDiscountMatrixName(discountMatrixName);
  
  // Try exact match first
  const exactMatch = findPriceBookMatch(products, parsed.category, parsed.edition);
  if (exactMatch) {
    return {
      category: exactMatch.category,
      edition: exactMatch.edition,
      monthlyPrice: exactMatch.monthly_list_price ?? exactMatch.annual_list_price / 12,
    };
  }
  
  // Try matching with first edition from multi-edition format
  if (parsed.editions.length > 0) {
    for (const edition of parsed.editions) {
      const match = findPriceBookMatch(products, parsed.category, edition);
      if (match) {
        return {
          category: match.category,
          edition: match.edition,
          monthlyPrice: match.monthly_list_price ?? match.annual_list_price / 12,
        };
      }
    }
  }
  
  // Fuzzy search as fallback
  const searchResults = searchProducts(products, parsed.category, 5);
  if (searchResults.length > 0 && searchResults[0].score > 0.7) {
    return {
      category: searchResults[0].category,
      edition: searchResults[0].edition,
      monthlyPrice: searchResults[0].monthlyPrice,
    };
  }
  
  return null;
}

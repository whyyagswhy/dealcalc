/**
 * Discount Approval Level Calculations
 * Determines the required approval level (L0-L5+) based on product, quantity, and discount percentage
 */

import type { DiscountThreshold } from '@/hooks/useDiscountThresholds';

export type ApprovalLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5+' | 'N/A';

export interface ApprovalResult {
  level: ApprovalLevel;
  maxL4Discount: number | null; // Max discount for instant approval (L4)
  isInstantApproval: boolean; // L0-L4 = instant, L5+ = escalation
  matchedProductName: string | null; // The actual product name that was matched
}

/**
 * Normalize a product name for matching
 * Removes extra whitespace and normalizes brackets
 */
function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Extract the base product name (category) from a discount matrix name
 * "[Enterprise, Unlimited] Sales Cloud" -> "sales cloud"
 */
function extractBaseName(productName: string): string {
  const match = productName.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (match) {
    return match[2].trim().toLowerCase();
  }
  return productName.trim().toLowerCase();
}

/**
 * Extract editions from a product name
 * "[Enterprise, Unlimited] Sales Cloud" -> ["enterprise", "unlimited"]
 */
function extractEditions(productName: string): string[] {
  const match = productName.match(/^\[([^\]]+)\]/);
  if (match) {
    return match[1].split(',').map(e => e.trim().toLowerCase());
  }
  return [];
}

/**
 * Find the threshold row for a specific product and quantity
 * Uses intelligent matching with fallbacks
 */
export function findThreshold(
  thresholds: DiscountThreshold[],
  productName: string,
  quantity: number
): DiscountThreshold | null {
  if (!productName) return null;
  
  const normalizedInput = normalizeProductName(productName);
  const inputBaseName = extractBaseName(productName);
  const inputEditions = extractEditions(productName);
  
  // 1. Try exact match first
  const exactMatch = thresholds.find(
    (t) =>
      normalizeProductName(t.product_name) === normalizedInput &&
      quantity >= t.qty_min &&
      quantity <= t.qty_max
  );
  if (exactMatch) return exactMatch;
  
  // 2. Try matching by base name + compatible editions
  // For "[Enterprise] Sales Cloud", match "[Unlimited] Sales Cloud" or "[Enterprise, Unlimited] Sales Cloud"
  const candidatesByBaseName = thresholds.filter(t => {
    const thresholdBaseName = extractBaseName(t.product_name);
    return thresholdBaseName === inputBaseName && 
           quantity >= t.qty_min && 
           quantity <= t.qty_max;
  });
  
  if (candidatesByBaseName.length > 0) {
    // Prefer matches where the editions overlap
    if (inputEditions.length > 0) {
      for (const candidate of candidatesByBaseName) {
        const candidateEditions = extractEditions(candidate.product_name);
        // Check if any input edition is in the candidate's editions
        const hasMatchingEdition = inputEditions.some(ed => 
          candidateEditions.includes(ed)
        );
        if (hasMatchingEdition) {
          return candidate;
        }
      }
    }
    // Fall back to first candidate with matching base name
    return candidatesByBaseName[0];
  }
  
  // 3. Try fuzzy base name matching (for minor spelling differences)
  const fuzzyMatches = thresholds.filter(t => {
    const thresholdBaseName = extractBaseName(t.product_name);
    // Check if the base names are similar (one contains the other)
    return (thresholdBaseName.includes(inputBaseName) || inputBaseName.includes(thresholdBaseName)) &&
           thresholdBaseName.length > 3 &&
           quantity >= t.qty_min &&
           quantity <= t.qty_max;
  });
  
  if (fuzzyMatches.length > 0) {
    // Prefer matches where editions overlap
    if (inputEditions.length > 0) {
      for (const candidate of fuzzyMatches) {
        const candidateEditions = extractEditions(candidate.product_name);
        const hasMatchingEdition = inputEditions.some(ed => 
          candidateEditions.includes(ed)
        );
        if (hasMatchingEdition) {
          return candidate;
        }
      }
    }
    return fuzzyMatches[0];
  }
  
  return null;
}

/**
 * Calculate the required approval level based on discount percentage
 * @param threshold - The discount threshold row for this product/qty
 * @param discountPercent - The discount as a decimal (e.g., 0.20 for 20%)
 * @returns ApprovalResult with level and max L4 discount
 */
export function calculateApprovalLevel(
  threshold: DiscountThreshold | null,
  discountPercent: number | null
): Omit<ApprovalResult, 'matchedProductName'> {
  // No threshold found = N/A (custom product or not in matrix)
  if (!threshold) {
    return { level: 'N/A', maxL4Discount: null, isInstantApproval: false };
  }

  // No discount set = L0
  if (discountPercent === null || discountPercent <= 0) {
    return { 
      level: 'L0', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }

  const discount = discountPercent; // Already as decimal (0.20 for 20%)

  // Find the highest available level that the discount falls within
  // Check each level from L0 to L4
  if (threshold.level_0_max !== null && discount <= threshold.level_0_max) {
    return { 
      level: 'L0', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }
  
  if (threshold.level_1_max !== null && discount <= threshold.level_1_max) {
    return { 
      level: 'L1', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }
  
  if (threshold.level_2_max !== null && discount <= threshold.level_2_max) {
    return { 
      level: 'L2', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }
  
  if (threshold.level_3_max !== null && discount <= threshold.level_3_max) {
    return { 
      level: 'L3', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }
  
  if (threshold.level_4_max !== null && discount <= threshold.level_4_max) {
    return { 
      level: 'L4', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }

  // Exceeds all available levels = requires escalation (L5+)
  return { 
    level: 'L5+', 
    maxL4Discount: threshold.level_4_max, 
    isInstantApproval: false 
  };
}

/**
 * Get approval result for a line item
 */
export function getApprovalResult(
  thresholds: DiscountThreshold[],
  productName: string,
  quantity: number,
  discountPercent: number | null
): ApprovalResult {
  const threshold = findThreshold(thresholds, productName, quantity);
  const result = calculateApprovalLevel(threshold, discountPercent);
  return {
    ...result,
    matchedProductName: threshold?.product_name ?? null,
  };
}

/**
 * Get the color class for an approval level badge
 */
export function getApprovalLevelColor(level: ApprovalLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'L0':
      return { 
        bg: 'bg-emerald-100', 
        text: 'text-emerald-800', 
        border: 'border-emerald-300' 
      };
    case 'L1':
      return { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        border: 'border-green-300' 
      };
    case 'L2':
      return { 
        bg: 'bg-lime-100', 
        text: 'text-lime-800', 
        border: 'border-lime-300' 
      };
    case 'L3':
      return { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        border: 'border-yellow-300' 
      };
    case 'L4':
      return { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        border: 'border-orange-300' 
      };
    case 'L5+':
      return { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        border: 'border-red-300' 
      };
    case 'N/A':
    default:
      return { 
        bg: 'bg-gray-100', 
        text: 'text-gray-600', 
        border: 'border-gray-300' 
      };
  }
}

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
}

/**
 * Find the threshold row for a specific product and quantity
 */
export function findThreshold(
  thresholds: DiscountThreshold[],
  productName: string,
  quantity: number
): DiscountThreshold | null {
  return thresholds.find(
    (t) =>
      t.product_name === productName &&
      quantity >= t.qty_min &&
      quantity <= t.qty_max
  ) ?? null;
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
): ApprovalResult {
  // No threshold found = N/A (custom product or not in matrix)
  if (!threshold) {
    return { level: 'N/A', maxL4Discount: null, isInstantApproval: false };
  }

  // No discount set = N/A
  if (discountPercent === null || discountPercent <= 0) {
    return { 
      level: 'L0', 
      maxL4Discount: threshold.level_4_max, 
      isInstantApproval: true 
    };
  }

  const discount = discountPercent; // Already as decimal (0.20 for 20%)

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

  // Exceeds L4 = requires escalation (L5+)
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
  return calculateApprovalLevel(threshold, discountPercent);
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

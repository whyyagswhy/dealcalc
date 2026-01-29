/**
 * Deal Scenario Calculator - Pure Calculation Functions
 * All pricing, ACV, and discount calculations
 */

import type { LineItem, RevenueType } from './types';

// ============ Core Line Item Calculations ============

/**
 * Calculate net unit price from list price and discount percentage
 * @param listPrice - List unit price (monthly)
 * @param discountPercent - Discount as decimal (e.g., 0.20 for 20%)
 */
export function calculateNetFromDiscount(listPrice: number, discountPercent: number): number {
  if (listPrice < 0 || discountPercent < 0 || discountPercent > 1) return 0;
  return listPrice * (1 - discountPercent);
}

/**
 * Calculate discount percentage from list price and net unit price
 * @param listPrice - List unit price (monthly)
 * @param netPrice - Net unit price (monthly)
 */
export function calculateDiscountFromNet(listPrice: number, netPrice: number): number {
  if (listPrice <= 0) return 0;
  if (netPrice < 0) return 0;
  if (netPrice > listPrice) return 0;
  return (listPrice - netPrice) / listPrice;
}

/**
 * Calculate line item monthly total (net)
 * @param netUnitPrice - Net unit price (monthly)
 * @param quantity - Number of units
 */
export function calculateLineMonthly(netUnitPrice: number, quantity: number): number {
  if (netUnitPrice < 0 || quantity < 0) return 0;
  return netUnitPrice * quantity;
}

/**
 * Calculate line item annual total (always 12 months)
 * @param netMonthly - Net monthly total
 */
export function calculateLineAnnual(netMonthly: number): number {
  return netMonthly * 12;
}

/**
 * Calculate line item term total
 * @param netMonthly - Net monthly total
 * @param termMonths - Contract term in months
 */
export function calculateLineTerm(netMonthly: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  return netMonthly * termMonths;
}

// ============ ACV Calculations ============

/**
 * Calculate ACV (Annual Contract Value)
 * ACV is always annualized to 12 months, regardless of term
 * @param netMonthly - Net monthly total
 */
export function calculateACV(netMonthly: number): number {
  return netMonthly * 12;
}

/**
 * Calculate Commissionable ACV
 * - Net New: CommissionableACV = NetAnnual (full value)
 * - Add-on: CommissionableACV = max(NetAnnual - ExistingAnnual, 0) (incremental only)
 * 
 * @param revenueType - 'net_new' or 'add_on'
 * @param netAnnual - New deal annual value
 * @param existingAnnual - Existing contract annual value (for add-ons)
 */
export function calculateCommissionableACV(
  revenueType: RevenueType,
  netAnnual: number,
  existingAnnual: number = 0
): number {
  if (revenueType === 'net_new') {
    return Math.max(netAnnual, 0);
  }
  // Add-on: only incremental value is commissionable
  return Math.max(netAnnual - existingAnnual, 0);
}

/**
 * Calculate existing annual value for add-on calculations
 * @param existingNetPrice - Existing net unit price (monthly)
 * @param existingVolume - Existing quantity
 */
export function calculateExistingAnnual(
  existingNetPrice: number | null,
  existingVolume: number | null
): number {
  if (existingNetPrice === null || existingVolume === null) return 0;
  if (existingNetPrice < 0 || existingVolume < 0) return 0;
  return existingNetPrice * existingVolume * 12;
}

// ============ Scenario Aggregate Calculations ============

export interface LineItemTotals {
  listMonthly: number;
  netMonthly: number;
  listAnnual: number;
  netAnnual: number;
  listTerm: number;
  netTerm: number;
  acv: number;
  commissionableACV: number;
  existingAnnual: number;
}

export interface ScenarioTotals {
  listMonthly: number;
  netMonthly: number;
  listAnnual: number;
  netAnnual: number;
  listTerm: number;
  netTerm: number;
  totalSavings: number;
  blendedDiscount: number;
  totalACV: number;
  totalCommissionableACV: number;
  totalExistingAnnual: number;
}

/**
 * Calculate all derived values for a single line item
 */
export function calculateLineItemTotals(lineItem: LineItem): LineItemTotals {
  const netUnitPrice = lineItem.net_unit_price ?? 
    calculateNetFromDiscount(lineItem.list_unit_price, lineItem.discount_percent ?? 0);
  
  const listMonthly = lineItem.list_unit_price * lineItem.quantity;
  const netMonthly = netUnitPrice * lineItem.quantity;
  const listAnnual = listMonthly * 12;
  const netAnnual = netMonthly * 12;
  const listTerm = listMonthly * lineItem.term_months;
  const netTerm = netMonthly * lineItem.term_months;
  const acv = calculateACV(netMonthly);
  
  const existingAnnual = calculateExistingAnnual(
    lineItem.existing_net_price,
    lineItem.existing_volume
  );
  
  const commissionableACV = calculateCommissionableACV(
    lineItem.revenue_type,
    netAnnual,
    existingAnnual
  );

  return {
    listMonthly,
    netMonthly,
    listAnnual,
    netAnnual,
    listTerm,
    netTerm,
    acv,
    commissionableACV,
    existingAnnual,
  };
}

/**
 * Calculate blended discount percentage
 * Weighted by term values: (termList - termNet) / termList
 * @param termList - Total list price over term
 * @param termNet - Total net price over term
 */
export function calculateBlendedDiscount(termList: number, termNet: number): number {
  if (termList <= 0) return 0;
  return (termList - termNet) / termList;
}

/**
 * Calculate total savings
 * @param termList - Total list price over term
 * @param termNet - Total net price over term
 */
export function calculateTotalSavings(termList: number, termNet: number): number {
  return Math.max(termList - termNet, 0);
}

/**
 * Calculate scenario totals from all line items
 */
export function calculateScenarioTotals(lineItems: LineItem[]): ScenarioTotals {
  const totals: ScenarioTotals = {
    listMonthly: 0,
    netMonthly: 0,
    listAnnual: 0,
    netAnnual: 0,
    listTerm: 0,
    netTerm: 0,
    totalSavings: 0,
    blendedDiscount: 0,
    totalACV: 0,
    totalCommissionableACV: 0,
    totalExistingAnnual: 0,
  };

  for (const lineItem of lineItems) {
    const itemTotals = calculateLineItemTotals(lineItem);
    totals.listMonthly += itemTotals.listMonthly;
    totals.netMonthly += itemTotals.netMonthly;
    totals.listAnnual += itemTotals.listAnnual;
    totals.netAnnual += itemTotals.netAnnual;
    totals.listTerm += itemTotals.listTerm;
    totals.netTerm += itemTotals.netTerm;
    totals.totalACV += itemTotals.acv;
    totals.totalCommissionableACV += itemTotals.commissionableACV;
    totals.totalExistingAnnual += itemTotals.existingAnnual;
  }

  totals.totalSavings = calculateTotalSavings(totals.listTerm, totals.netTerm);
  totals.blendedDiscount = calculateBlendedDiscount(totals.listTerm, totals.netTerm);

  return totals;
}

// ============ Display Helpers ============

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

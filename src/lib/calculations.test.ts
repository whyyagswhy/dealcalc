import { describe, it, expect } from 'vitest';
import {
  calculateNetFromDiscount,
  calculateDiscountFromNet,
  calculateLineMonthly,
  calculateLineAnnual,
  calculateLineTerm,
  calculateACV,
  calculateCommissionableACV,
  calculateExistingAnnual,
  calculateLineItemTotals,
  calculateBlendedDiscount,
  calculateTotalSavings,
  calculateScenarioTotals,
  formatCurrency,
  formatPercent,
} from './calculations';
import type { LineItem } from './types';

describe('Core Line Item Calculations', () => {
  describe('calculateNetFromDiscount', () => {
    it('calculates net price with 20% discount', () => {
      expect(calculateNetFromDiscount(100, 0.2)).toBe(80);
    });

    it('calculates net price with 0% discount', () => {
      expect(calculateNetFromDiscount(100, 0)).toBe(100);
    });

    it('calculates net price with 100% discount', () => {
      expect(calculateNetFromDiscount(100, 1)).toBe(0);
    });

    it('returns 0 for negative list price', () => {
      expect(calculateNetFromDiscount(-100, 0.2)).toBe(0);
    });

    it('returns 0 for negative discount', () => {
      expect(calculateNetFromDiscount(100, -0.2)).toBe(0);
    });

    it('returns 0 for discount over 100%', () => {
      expect(calculateNetFromDiscount(100, 1.5)).toBe(0);
    });
  });

  describe('calculateDiscountFromNet', () => {
    it('calculates 20% discount from prices', () => {
      expect(calculateDiscountFromNet(100, 80)).toBe(0.2);
    });

    it('calculates 0% discount when net equals list', () => {
      expect(calculateDiscountFromNet(100, 100)).toBe(0);
    });

    it('calculates 100% discount when net is 0', () => {
      expect(calculateDiscountFromNet(100, 0)).toBe(1);
    });

    it('returns 0 for zero list price', () => {
      expect(calculateDiscountFromNet(0, 80)).toBe(0);
    });

    it('returns 0 for negative list price', () => {
      expect(calculateDiscountFromNet(-100, 80)).toBe(0);
    });

    it('returns 0 for negative net price', () => {
      expect(calculateDiscountFromNet(100, -80)).toBe(0);
    });

    it('returns 0 when net exceeds list (invalid)', () => {
      expect(calculateDiscountFromNet(100, 150)).toBe(0);
    });
  });

  describe('calculateLineMonthly', () => {
    it('calculates monthly total correctly', () => {
      expect(calculateLineMonthly(150, 25)).toBe(3750);
    });

    it('returns 0 for zero quantity', () => {
      expect(calculateLineMonthly(150, 0)).toBe(0);
    });

    it('returns 0 for negative price', () => {
      expect(calculateLineMonthly(-150, 25)).toBe(0);
    });

    it('returns 0 for negative quantity', () => {
      expect(calculateLineMonthly(150, -25)).toBe(0);
    });
  });

  describe('calculateLineAnnual', () => {
    it('multiplies monthly by 12', () => {
      expect(calculateLineAnnual(1000)).toBe(12000);
    });

    it('handles zero', () => {
      expect(calculateLineAnnual(0)).toBe(0);
    });
  });

  describe('calculateLineTerm', () => {
    it('calculates term total correctly', () => {
      expect(calculateLineTerm(1000, 24)).toBe(24000);
    });

    it('returns 0 for zero term', () => {
      expect(calculateLineTerm(1000, 0)).toBe(0);
    });

    it('returns 0 for negative term', () => {
      expect(calculateLineTerm(1000, -12)).toBe(0);
    });
  });
});

describe('ACV Calculations', () => {
  describe('calculateACV', () => {
    it('calculates ACV as monthly * 12', () => {
      expect(calculateACV(1000)).toBe(12000);
    });

    it('handles zero', () => {
      expect(calculateACV(0)).toBe(0);
    });

    it('ACV is always annualized regardless of term', () => {
      // Even if term is 6 months, ACV is still monthly * 12
      const netMonthly = 1000;
      expect(calculateACV(netMonthly)).toBe(12000);
    });
  });

  describe('calculateCommissionableACV', () => {
    it('returns full ACV for net_new revenue', () => {
      expect(calculateCommissionableACV('net_new', 120000, 0)).toBe(120000);
    });

    it('returns full ACV for net_new even with existing value', () => {
      expect(calculateCommissionableACV('net_new', 120000, 60000)).toBe(120000);
    });

    it('returns incremental value for add_on', () => {
      expect(calculateCommissionableACV('add_on', 120000, 60000)).toBe(60000);
    });

    it('returns 0 for add_on when existing exceeds new', () => {
      expect(calculateCommissionableACV('add_on', 60000, 120000)).toBe(0);
    });

    it('returns 0 for add_on when values are equal', () => {
      expect(calculateCommissionableACV('add_on', 100000, 100000)).toBe(0);
    });

    it('returns full value for add_on with no existing', () => {
      expect(calculateCommissionableACV('add_on', 120000, 0)).toBe(120000);
    });

    it('handles negative net annual', () => {
      expect(calculateCommissionableACV('net_new', -10000, 0)).toBe(0);
    });
  });

  describe('calculateExistingAnnual', () => {
    it('calculates existing annual correctly', () => {
      expect(calculateExistingAnnual(100, 10)).toBe(12000); // 100 * 10 * 12
    });

    it('returns 0 for null price', () => {
      expect(calculateExistingAnnual(null, 10)).toBe(0);
    });

    it('returns 0 for null volume', () => {
      expect(calculateExistingAnnual(100, null)).toBe(0);
    });

    it('returns 0 for negative price', () => {
      expect(calculateExistingAnnual(-100, 10)).toBe(0);
    });

    it('returns 0 for negative volume', () => {
      expect(calculateExistingAnnual(100, -10)).toBe(0);
    });
  });
});

describe('Scenario Aggregate Calculations', () => {
  const createLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
    id: 'test-id',
    scenario_id: 'scenario-id',
    product_name: 'Test Product',
    list_unit_price: 100,
    quantity: 10,
    term_months: 12,
    discount_percent: 0.2,
    net_unit_price: 80,
    revenue_type: 'net_new',
    existing_volume: null,
    existing_net_price: null,
    existing_term_months: null,
    display_override: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('calculateLineItemTotals', () => {
    it('calculates all totals for a line item', () => {
      const lineItem = createLineItem();
      const totals = calculateLineItemTotals(lineItem);

      expect(totals.listMonthly).toBe(1000); // 100 * 10
      expect(totals.netMonthly).toBe(800); // 80 * 10
      expect(totals.listAnnual).toBe(12000); // 1000 * 12
      expect(totals.netAnnual).toBe(9600); // 800 * 12
      expect(totals.listTerm).toBe(12000); // 1000 * 12
      expect(totals.netTerm).toBe(9600); // 800 * 12
      expect(totals.acv).toBe(9600); // 800 * 12
      expect(totals.commissionableACV).toBe(9600); // net_new, full value
      expect(totals.existingAnnual).toBe(0);
    });

    it('uses discount to calculate net when net_unit_price is null', () => {
      const lineItem = createLineItem({
        net_unit_price: null,
        discount_percent: 0.2,
      });
      const totals = calculateLineItemTotals(lineItem);

      expect(totals.netMonthly).toBe(800); // 80 * 10 (computed from 20% discount)
    });

    it('calculates add_on with existing volume', () => {
      const lineItem = createLineItem({
        revenue_type: 'add_on',
        existing_net_price: 70,
        existing_volume: 8,
      });
      const totals = calculateLineItemTotals(lineItem);

      expect(totals.existingAnnual).toBe(6720); // 70 * 8 * 12
      expect(totals.netAnnual).toBe(9600); // 80 * 10 * 12
      expect(totals.commissionableACV).toBe(2880); // 9600 - 6720
    });
  });

  describe('calculateBlendedDiscount', () => {
    it('calculates blended discount correctly', () => {
      expect(calculateBlendedDiscount(10000, 8000)).toBe(0.2);
    });

    it('returns 0 for zero list', () => {
      expect(calculateBlendedDiscount(0, 8000)).toBe(0);
    });

    it('returns 0 when net equals list', () => {
      expect(calculateBlendedDiscount(10000, 10000)).toBe(0);
    });

    it('returns 1 (100%) when net is zero', () => {
      expect(calculateBlendedDiscount(10000, 0)).toBe(1);
    });
  });

  describe('calculateTotalSavings', () => {
    it('calculates savings correctly', () => {
      expect(calculateTotalSavings(10000, 8000)).toBe(2000);
    });

    it('returns 0 when net exceeds list', () => {
      expect(calculateTotalSavings(8000, 10000)).toBe(0);
    });
  });

  describe('calculateScenarioTotals', () => {
    it('aggregates multiple line items', () => {
      const lineItems = [
        createLineItem({ list_unit_price: 100, quantity: 10, net_unit_price: 80 }),
        createLineItem({ list_unit_price: 200, quantity: 5, net_unit_price: 160 }),
      ];
      const totals = calculateScenarioTotals(lineItems);

      expect(totals.listMonthly).toBe(2000); // 1000 + 1000
      expect(totals.netMonthly).toBe(1600); // 800 + 800
      expect(totals.listAnnual).toBe(24000);
      expect(totals.netAnnual).toBe(19200);
      expect(totals.totalACV).toBe(19200);
      expect(totals.blendedDiscount).toBe(0.2); // 20% overall
      expect(totals.totalSavings).toBe(4800);
    });

    it('handles empty line items', () => {
      const totals = calculateScenarioTotals([]);

      expect(totals.listMonthly).toBe(0);
      expect(totals.netMonthly).toBe(0);
      expect(totals.blendedDiscount).toBe(0);
      expect(totals.totalSavings).toBe(0);
    });

    it('handles mixed revenue types', () => {
      const lineItems = [
        createLineItem({
          list_unit_price: 100,
          quantity: 10,
          net_unit_price: 80,
          revenue_type: 'net_new',
        }),
        createLineItem({
          list_unit_price: 100,
          quantity: 10,
          net_unit_price: 80,
          revenue_type: 'add_on',
          existing_net_price: 70,
          existing_volume: 8,
        }),
      ];
      const totals = calculateScenarioTotals(lineItems);

      // Net New: full 9600
      // Add-on: 9600 - (70 * 8 * 12 = 6720) = 2880
      expect(totals.totalCommissionableACV).toBe(12480);
      expect(totals.totalExistingAnnual).toBe(6720);
    });
  });
});

describe('Display Helpers', () => {
  describe('formatCurrency', () => {
    it('formats whole numbers', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
    });

    it('formats large numbers with commas', () => {
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('rounds decimals', () => {
      expect(formatCurrency(1000.5)).toBe('$1,001');
    });
  });

  describe('formatPercent', () => {
    it('formats decimal as percentage', () => {
      expect(formatPercent(0.2)).toBe('20.0%');
    });

    it('formats zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('formats 100%', () => {
      expect(formatPercent(1)).toBe('100.0%');
    });
  });
});

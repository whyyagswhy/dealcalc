

# Discount Matrix Product Autocomplete - Perfect Match Implementation

## Overview

This plan replaces the current price book-based product autocomplete with one that uses the **exact product names from the discount matrix CSV**. This ensures 100% accurate matching for discount approval level lookups.

## The Problem

Currently:
- `price_book_products` table has product names like: `"Sales Cloud - Enterprise Edition"`
- Discount matrix CSV has product names like: `"[Enterprise, Unlimited] Sales Cloud"`

These formats are incompatible for exact matching, which breaks discount approval level accuracy.

## The Solution

Use the **discount matrix product names as the single source of truth** for the autocomplete. When a user selects a product, the exact string (e.g., `"[Enterprise, Unlimited] Agentforce Conversations"`) is stored and can be matched perfectly against the discount thresholds.

---

## Database Changes

### New Table: `discount_thresholds`

Create a table to store the complete discount matrix (1,908 rows) with volume-based tiers:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `product_name` | text | Exact product name from CSV (e.g., `"[Enterprise, Unlimited] Agentforce Conversations"`) |
| `qty_min` | integer | Minimum quantity for this tier |
| `qty_max` | integer | Maximum quantity for this tier |
| `level_0_max` | numeric | Max discount for Level 0 (as decimal) |
| `level_1_max` | numeric | Max discount for Level 1 |
| `level_2_max` | numeric | Max discount for Level 2 |
| `level_3_max` | numeric | Max discount for Level 3 |
| `level_4_max` | numeric | Max discount for Level 4 |
| `created_at` | timestamp | Created timestamp |

The migration will:
1. Create the `discount_thresholds` table
2. Seed all 1,908 rows from the CSV
3. Add indexes for product name lookup

---

## Product Name Format Analysis

From the CSV, product names follow these patterns:

**Single edition:**
- `[Enterprise] Sales Cloud`
- `[Unlimited] Service Cloud Voice`
- `[Professional] Web Services API`

**Multiple editions:**
- `[Enterprise, Unlimited] Agentforce Conversations`
- `[Essentials, Professional, Enterprise, Unlimited] B2C Commerce - Growth`
- `[Essentials, Enterprise, Unlimited] Analytics - 5 Additional Dynamic Dashboards`

**Key characteristics:**
- Edition prefixes are always in square brackets
- Multiple editions are comma-separated
- Product name follows the closing bracket
- Same product with different edition combinations = different rows

---

## Updated ProductCombobox Behavior

### Data Source Change

Instead of fetching from `price_book_products`, the combobox will:
1. Fetch **unique product names** from `discount_thresholds` table
2. Group products by extracting a "display category" from the product name
3. Show exact product names for selection

### New Hook: `useDiscountMatrixProducts`

```text
SELECT DISTINCT product_name FROM discount_thresholds ORDER BY product_name;
```

Returns ~400+ unique product names (many products have multiple volume tiers but share the same name).

### Display Grouping

Products will be grouped by the "core product" extracted from the name:

| Original Product Name | Extracted Group |
|----------------------|-----------------|
| `[Enterprise, Unlimited] Sales Cloud` | Sales Cloud |
| `[Unlimited] Service Cloud Voice` | Service Cloud |
| `[Enterprise] CRM Analytics Growth` | CRM Analytics |
| `[Essentials, ...] B2C Commerce - Growth` | Commerce |

### Search Behavior

- User types "Sales Cloud" -> shows all `[...] Sales Cloud...` variants
- User types "Enterprise" -> shows all products with `[Enterprise...]` prefix
- User types "Agentforce" -> shows products containing "Agentforce"

---

## Implementation Files

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useDiscountThresholds.ts` | Hook to fetch thresholds and unique product names |
| `src/lib/discountApproval.ts` | Approval level calculation functions |
| `src/components/scenarios/ApprovalLevelBadge.tsx` | Visual badge component |
| Database migration | Create table + seed 1,908 rows |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/scenarios/ProductCombobox.tsx` | Switch data source to discount matrix products |
| `src/lib/priceBookTypes.ts` | Add types for discount threshold products |
| `src/components/scenarios/LineItemRow.tsx` | Integrate approval badge (next phase) |

---

## ProductCombobox UI Updates

### Before (Current)
- Shows: `"Sales Cloud - Enterprise Edition"` with `$2,100/yr`
- Groups by category field from price_book_products
- Prices shown from price book

### After (New)
- Shows: `"[Enterprise, Unlimited] Sales Cloud"` 
- Groups by extracted core product name
- No prices shown (discount matrix doesn't include prices)
- Edition info visible in the product name itself

### Visual Layout

```text
┌─ Product Field ─────────────────────────────────────────────┐
│ [[Enterprise, Unlimited] Sales C...  ▼]                     │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search products...                                       │
├─────────────────────────────────────────────────────────────┤
│   Agentforce                                                │
│   ├─ [Enterprise, Unlimited] Additional Einstein Requests  │
│   ├─ [Enterprise, Unlimited] Agentforce Conversations       │
│   Data Cloud                                                │
│   ├─ [Enterprise, Unlimited] Customer Data Cloud Starter    │
│   ├─ [Enterprise, Unlimited] Data 360 Profiles (1,000)      │
│   Sales Cloud                                               │
│   ├─ [Enterprise] Sales Cloud                               │
│   ├─ [Enterprise, Unlimited] Sales Cloud                    │
│   ├─ [Unlimited] Sales Cloud                                │
│   ...                                                       │
├─────────────────────────────────────────────────────────────┤
│ + Use custom product: "Custom Widget"                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Category Extraction Logic

To group products in the dropdown, extract the "core category" from product names:

```text
extractCategory(productName):
  1. Remove edition prefix: "[Enterprise, Unlimited] Sales Cloud" -> "Sales Cloud"
  2. Take first segment before " - " if present: "CRM Analytics - Growth" -> "CRM Analytics"
  3. Map known prefixes to categories:
     - "Sales Cloud..." -> "Sales Cloud"
     - "Service Cloud..." -> "Service Cloud"
     - "Data Cloud...", "Customer Data Cloud..." -> "Data Cloud"
     - "CRM Analytics...", "Analytics..." -> "Analytics"
     - "B2C Commerce...", "B2B Commerce..." -> "Commerce"
     - "Field Service..." -> "Field Service"
     - "Heroku..." -> "Heroku"
     - "Slack..." -> "Slack"
     - Default: "Other"
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Product not in matrix | Show custom entry option, approval badge shows "N/A" |
| Same product, different editions | Each shown as separate selectable item |
| Very long product names | Truncate with ellipsis in trigger, full name in dropdown |
| Empty search results | Show "No products found" + custom entry option |

---

## Data Seeding

The migration will seed all 1,908 rows from the CSV:

**Sample data transformations:**
| CSV Value | Database Value |
|-----------|----------------|
| `"[Enterprise, Unlimited] Agentforce Conversations"` | `[Enterprise, Unlimited] Agentforce Conversations` |
| `17.00%` | `0.17` (numeric) |
| `>50.00%` | (ignored - L5 threshold derived from L4) |
| Empty cell | `NULL` |

**Quantity ranges preserved exactly:**
- Row 1: qty_min=1, qty_max=99999
- Row 2: qty_min=100000, qty_max=499999
- etc.

---

## Matching Guarantee

With this implementation:

1. User selects: `"[Enterprise, Unlimited] Agentforce Conversations"`
2. Line item stores: `product_name = "[Enterprise, Unlimited] Agentforce Conversations"`
3. Approval lookup queries: `WHERE product_name = '[Enterprise, Unlimited] Agentforce Conversations' AND qty_min <= 50 AND qty_max >= 50`
4. **Exact match found** - approval levels are 100% accurate

---

## Technical Implementation Order

1. Create database migration with `discount_thresholds` table
2. Seed all 1,908 rows from CSV (percentage strings to decimals)
3. Update `priceBookTypes.ts` with new interfaces
4. Create `useDiscountThresholds.ts` hook
5. Update `ProductCombobox.tsx` to use discount matrix products
6. Test with line item creation

---

## Future Phase (Not in this plan)

After the product autocomplete is working with exact matching:
- Add `ApprovalLevelBadge.tsx` component
- Add approval level calculation in `discountApproval.ts`
- Integrate badge and "Apply Max L4" toggle into `LineItemRow.tsx`


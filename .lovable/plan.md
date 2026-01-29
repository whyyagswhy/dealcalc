
# Product Autocomplete with Price Book Integration

## Overview

This feature replaces the free-text product input with a searchable autocomplete (combobox) that pulls from the Salesforce price book stored in the database. When a user selects a product from the price book, the system can accurately match it to the correct discount thresholds for approval level display.

## Why This Matters

The current free-text product field makes it impossible to guarantee accurate discount approval level matching. By selecting from a predefined price book:
- Product names are **exact matches** to the discount threshold table
- List prices can be auto-populated from the price book
- Discount approval levels will be **100% accurate**

## Database Design

### Table: `price_book_products`

Stores the complete Salesforce price book extracted from the PDF:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `product_name` | text | Full product name (e.g., "Sales Cloud - Agentforce 1 Edition") |
| `category` | text | Product category (e.g., "Sales Cloud", "Data Cloud") |
| `edition` | text | Edition tier ("Enterprise", "Unlimited", "Professional") |
| `annual_list_price` | numeric | Annual list price in USD |
| `monthly_list_price` | numeric | Calculated monthly price (annual/12) |
| `pricing_unit` | text | Unit type ("per_user", "per_org", "per_unit") |
| `created_at` | timestamp | Created timestamp |
| `updated_at` | timestamp | Updated timestamp |

**RLS Policy:** All authenticated users can SELECT (read-only reference data)

### Seed Data

Approximately 700 products from the parsed Price List PDF including:
- Sales Cloud editions ($165-$550/user/month)
- Service Cloud editions
- Data Cloud products
- Commerce Cloud products
- Marketing Cloud products
- Platform and Slack products

---

## New Components

### 1. ProductCombobox Component

A searchable autocomplete that allows users to:
- Type to filter the product list
- Select a product from the dropdown
- OR continue typing a custom product name (for unlisted products)

```text
┌─ Product Field ─────────────────────────────────────────────┐
│ [Sales Cloud - Ag...         ▼] ← combobox trigger         │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search products...              ← search input          │
├─────────────────────────────────────────────────────────────┤
│   Sales Cloud                      ← category group        │
│   ├─ Sales Cloud - Agentforce 1 Edition  $6,600/yr        │
│   ├─ Sales Cloud - Einstein 1 Edition    $6,000/yr        │
│   └─ Sales Cloud - Unlimited Edition     $3,960/yr        │
│   Service Cloud                                             │
│   ├─ Service Cloud Enterprise Edition    $2,100/yr        │
│   └─ ...                                                    │
├─────────────────────────────────────────────────────────────┤
│ + Use custom product: "Sales Cloud Custom"                  │
│   ↑ appears when no exact match                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Grouped by product category for easy navigation
- Shows annual list price for reference
- Allows custom product entry if not in list
- Virtual scrolling for performance (700+ products)

### 2. Updated LineItemRow Integration

When a price book product is selected:
1. Product name is set (exact match to discount thresholds)
2. Monthly list price is auto-populated from price book
3. User can still override the list price if needed
4. Discount approval levels now match accurately

---

## Data Hooks

### `usePriceBookProducts` Hook

```text
usePriceBookProducts():
  - Fetches all products from price_book_products table
  - Caches with TanStack Query (staleTime: 10 minutes)
  - Returns { data: PriceBookProduct[], isLoading, error }
  - Includes search/filter helper functions
```

---

## User Experience Flow

1. **User clicks product field** -> Combobox opens with search input
2. **User types "Sales Cloud"** -> List filters to matching products
3. **User clicks "Sales Cloud - Agentforce 1 Edition"** -> 
   - Product name set to exact match
   - List price auto-fills to $550/mo
   - Discount approval lookup will use exact product name
4. **User enters discount or net price** -> Approval level badge shows correct level (L1-L5)
5. **Custom product flow**: If user types "Custom Widget" (not in list):
   - Option appears: "+ Use custom product: Custom Widget"
   - Selecting it sets product name but leaves price empty
   - Approval matching uses fuzzy logic (may show "N/A" if no match)

---

## Implementation Files

### New Files

| File | Purpose |
|------|---------|
| `src/components/scenarios/ProductCombobox.tsx` | Searchable product autocomplete component |
| `src/hooks/usePriceBookProducts.ts` | Hook to fetch and cache price book data |
| `src/lib/priceBookTypes.ts` | TypeScript interfaces for price book |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/scenarios/LineItemRow.tsx` | Replace Input with ProductCombobox, auto-fill price on select |
| `src/lib/types.ts` | Add PriceBookProduct interface |

### Database Migration

- Create `price_book_products` table
- Add RLS policy for authenticated read access
- Seed with extracted price list data

---

## Component Props

### ProductCombobox Props

```text
interface ProductComboboxProps {
  value: string;                    // Current product name
  onChange: (value: string) => void; // Called when product changes
  onPriceSelect?: (monthlyPrice: number) => void; // Called when a price book product is selected
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
```

---

## Keyboard Accessibility

- **Arrow keys**: Navigate options
- **Enter**: Select highlighted option
- **Escape**: Close dropdown
- **Tab**: Close and move to next field
- **Type**: Filter products by name

---

## Performance Considerations

1. **Virtual scrolling**: For 700+ products, use `@tanstack/react-virtual` for smooth scrolling
2. **Debounced search**: 150ms debounce on search input
3. **Client-side caching**: Price book data cached for 10 minutes
4. **Lazy loading**: Popover content rendered only when open

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty price book | Show message: "No products available" |
| Search with no results | Show "No products found" + custom entry option |
| Price book product selected then edited | Warn that editing name may affect discount matching |
| Loading state | Show skeleton loader in dropdown |
| Network error | Show error message, allow custom entry |

---

## Visual Design

The combobox follows the existing design system:
- Height: 40px (h-10) to match other inputs
- Border radius: rounded-button
- Focus ring: ring-2 ring-ring
- Popover: Matches existing popover styling
- Groups: Subtle header styling for category names

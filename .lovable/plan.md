
# Plan: Intuitive Hierarchical Product Picker with Price Auto-Fill

## Summary
Replace the current flat product combobox with a two-step hierarchical picker: first select a **Category** (e.g., "Sales Cloud"), then select an **Edition** (e.g., "Enterprise" or "Unlimited"). This matches how Salesforce products are actually structured and automatically populates the list price from the price book.

## Problems Identified

1. **Naming Mismatch**: The discount matrix has products like `[Unlimited] Sales Cloud` while the price book has `Sales Cloud - Unlimited Edition`. The lookup fails because these names don't match.

2. **Flat List UX**: The current dropdown shows ~1,900 products in a single flat list, making it hard to find what you need.

3. **No Price Auto-Fill**: Due to the naming mismatch, the price lookup returns `undefined` and list price doesn't populate.

## Solution Architecture

```text
+--------------------+     +--------------------+
|  Category Select   | --> |   Edition Select   | --> Auto-fill List Price
|  "Sales Cloud"     |     |  "Enterprise"      |     + Set product_name
+--------------------+     +--------------------+
         |                          |
         v                          v
  price_book_products        Constructs final name:
  (distinct categories)      "[Enterprise] Sales Cloud"
                             for discount matrix lookup
```

## Implementation Steps

### Step 1: Create New Hierarchical Product Picker Component
Create `src/components/scenarios/HierarchicalProductPicker.tsx`:

- **Category dropdown**: Lists distinct categories from `price_book_products` (Sales Cloud, Service Cloud, etc.)
- **Edition dropdown**: Shows available editions for the selected category (Enterprise, Unlimited, Professional, etc.)
- When both are selected:
  - Look up price from `price_book_products` using category + edition
  - Construct the discount matrix product name: `[{edition}] {category}` (e.g., `[Enterprise] Sales Cloud`)
  - Return both values to parent: product name for discount lookup, price for auto-fill

### Step 2: Create Product Mapping Utilities
Add `src/lib/productMapping.ts`:

- `buildDiscountMatrixName(category, edition)`: Constructs `[Enterprise] Sales Cloud` format
- `parseDiscountMatrixName(productName)`: Extracts category and edition from `[Enterprise] Sales Cloud`
- `findPriceBookMatch(priceBook, category, edition)`: Finds matching price book entry

### Step 3: Update Price Book Hook
Modify `src/hooks/usePriceBook.ts`:

- Add new query for distinct categories with their editions
- Create lookup by category + edition instead of just product name

### Step 4: Update LineItemRow Integration
Modify `src/components/scenarios/LineItemRow.tsx`:

- Replace `ProductCombobox` with new `HierarchicalProductPicker`
- Handle both outputs: `product_name` for saving + discount matrix, `listPrice` for auto-fill
- Support editing existing line items by parsing the stored product name

### Step 5: Keep Existing Combobox as Fallback
- Keep "Custom product" option for products not in the standard list
- Add a "More products..." option that opens the full searchable list

## UI Design

```text
Row 1 (new layout):
+------------------+  +------------------+  +-----------+
|  Category   ▾    |  |  Edition    ▾    |  | [Mo/An]   |
|  Sales Cloud     |  |  Enterprise      |  |  toggle   |
+------------------+  +------------------+  +-----------+

Row 2 (unchanged):
+-------------+  +-------+  +-----------+
| List Price  |  |  Qty  |  | Term (mo) |
|  $175.00    |  |  25   |  |    12     |
+-------------+  +-------+  +-----------+
```

## Data Flow

1. User selects **Category**: "Sales Cloud"
2. User selects **Edition**: "Enterprise"
3. System looks up `price_book_products` where category="Sales Cloud" AND edition="Enterprise"
4. System auto-fills List Price: `$175/mo`
5. System sets `product_name` to `[Enterprise] Sales Cloud` for discount matrix compatibility

## Edge Cases

- **Products without editions**: Some add-ons have no edition (e.g., "Pardot"). Show edition dropdown as "N/A" or hide it.
- **Custom products**: Keep the "Custom product" option for items not in the price book.
- **Existing line items**: Parse stored `product_name` to pre-select category and edition.

---

## Technical Details

### Files to Create
- `src/components/scenarios/HierarchicalProductPicker.tsx` - New two-step picker component
- `src/lib/productMapping.ts` - Name parsing and construction utilities

### Files to Modify
- `src/hooks/usePriceBook.ts` - Add category/edition grouping query
- `src/components/scenarios/LineItemRow.tsx` - Integrate new picker

### Database
No database changes needed. Both tables already have the required data structure.

### Testing Criteria
1. Select "Sales Cloud" > "Enterprise" - List price should auto-fill to $175
2. Discount badge should show approval levels correctly (product name matches discount matrix)
3. Max L4 button should apply the correct maximum discount
4. Existing line items with `[Enterprise] Sales Cloud` should show correct category/edition selected

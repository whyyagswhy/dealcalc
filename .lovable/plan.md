
# Plan: Auto-Match Imported Contract Products to Price Book

## Summary
When a user imports a contract via the AI extraction feature, enhance the flow to:
1. **Automatically match** each extracted product name to the price book using fuzzy search
2. **Update the list price** from the price book for matched products
3. **Format the product name** in discount matrix format (`[Edition] Category`) for proper discount lookups
4. **Create a "Current Contract" scenario** with all matched line items

---

## Current Flow

```
Contract Image → AI Extraction → Editable Table → Manual Review → Create Scenario
                                     ↓
                          Raw product names like:
                          "Sales Cloud Enterprise"
                          "Service Cloud - Unlimited Edition"
```

**Problem**: Extracted product names don't match the discount matrix format, and list prices aren't auto-populated from the price book.

---

## New Flow

```
Contract Image → AI Extraction → AI Product Matching → Editable Table → Create Scenario
                                     ↓                       ↓
                          Matched to price book:      Shows matched price,
                          "[Enterprise] Sales Cloud"   allows manual override
```

---

## Implementation Steps

### Step 1: Create Product Matching Edge Function
**New file: `supabase/functions/match-products/index.ts`**

This function will:
1. Accept an array of raw product names from the extraction
2. Query the price book products from the database
3. Use AI (Gemini 2.5 Flash) to intelligently match each extracted product to a price book entry
4. Return matched products with their correct names and prices

**Why AI matching?**
- Extracted product names are messy: "Sales Cloud Enterprise Edition", "SF Sales - Enterprise", "Salesforce Sales Cloud (Enterprise)"
- All should map to `Sales Cloud` category + `Enterprise` edition
- AI can understand semantic equivalence better than fuzzy string matching alone

### Step 2: Update Extract Contract Function  
**Modify: `supabase/functions/extract-contract/index.ts`**

Add product matching as a second step after extraction:
1. Extract raw line items from the image (existing)
2. Fetch price book products from database
3. Call AI to match each product name to price book entries
4. Return enriched line items with:
   - `matched_product_name`: The discount matrix format name
   - `matched_list_price`: Price from price book (or original if no match)
   - `match_confidence`: high/medium/low
   - `original_product_name`: What was extracted from the image

### Step 3: Update Import Dialog UI
**Modify: `src/components/deals/ImportContractDialog.tsx`**

Enhance the editable table to show:
- Match status indicator (checkmark for matched, warning for unmatched)
- Display matched product name with ability to override
- Show list price from price book (auto-filled)
- Keep original extracted name visible for reference

### Step 4: Update Line Item Creation
**Modify: `src/pages/DealDetail.tsx` - `handleImportContract`**

Use the matched product names when creating line items so they work correctly with:
- Discount matrix lookups (Max L4 button)
- Approval level calculations

---

## Technical Details

### Edge Function: Extract Contract (Updated)

```typescript
// After extracting raw line items...
const matchedItems = await matchProductsToBook(extractedData.line_items, priceBookProducts);

return {
  success: true,
  data: {
    line_items: matchedItems,  // Now includes matched_product_name, matched_list_price
    confidence: extractedData.confidence,
    notes: extractedData.notes,
  }
};
```

### AI Product Matching Prompt

```
You are matching product names from a contract to a Salesforce price book.

Price Book Products:
[List of category + edition combinations]

Extracted Products to Match:
1. "Sales Cloud Enterprise Edition" 
2. "SF Service - Unlimited"
...

For each extracted product, find the best match from the price book.
Return the matched category and edition, or null if no good match exists.
```

### Enhanced Line Item Interface

```typescript
interface ExtractedLineItem {
  // Original extracted values
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
  
  // New: matching results
  matched_product_name: string | null;  // "[Enterprise] Sales Cloud"
  matched_list_price: number | null;    // From price book
  match_confidence: 'high' | 'medium' | 'low' | 'none';
}
```

### UI Display in Import Dialog

| Original | Matched Product | List Price | Qty | Net Price |
|----------|-----------------|------------|-----|-----------|
| "Sales Cloud Enterprise" | ✓ Sales Cloud - Enterprise | $175/mo | 50 | $140/mo |
| "Custom App" | ⚠ No match (keep as-is) | $50/mo | 10 | $50/mo |

---

## Files to Create

| File | Purpose |
|------|---------|
| (None - consolidating into extract-contract function) | |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/extract-contract/index.ts` | Add product matching step after extraction |
| `src/components/deals/ImportContractDialog.tsx` | Show match status, use matched values |
| `src/pages/DealDetail.tsx` | Use matched product names when creating line items |

---

## Testing Criteria

1. **Upload a contract image** - Products should be extracted and matched to price book
2. **Matched products show checkmark** - With correct category/edition and price from price book
3. **Unmatched products show warning** - User can manually edit
4. **Created scenario uses matched names** - Format like `[Enterprise] Sales Cloud`
5. **Max L4 button works** - Discount matrix lookup succeeds with matched names
6. **List prices auto-fill** - From price book for matched products

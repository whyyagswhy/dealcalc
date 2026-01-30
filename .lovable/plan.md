
# Deal Summary Generator - Implementation Plan

## Overview
Add a one-click AI-powered summary generator to the Deal Detail page that creates customer-ready talking points and value propositions. The feature includes a floating action button with an optional prompt field for customization, generating clear, human-formatted summaries that highlight savings, value, and key deal points.

---

## User Experience Flow

```text
+------------------------------------------+
|  Deal Header (Acme Corp Deal)            |
|  [Monthly/Annual] [Internal/Customer] ⋮  |
+------------------------------------------+
|                                          |
|  Scenarios...                            |
|                                          |
+------------------------------------------+
                     |
                     v
    +------------------------------------+
    |  [✨ Generate Summary]  floating   |
    +------------------------------------+
                     |
        Click opens bottom sheet/dialog
                     v
    +------------------------------------+
    | Generate Deal Summary              |
    |------------------------------------|
    | Optional: Add context for AI       |
    | [Focus on multi-year savings...  ] |
    |                                    |
    | [✨ Generate]                      |
    +------------------------------------+
                     |
                     v
    +------------------------------------+
    | Deal Summary                       |
    |------------------------------------|
    | ## Acme Corp Deal                  |
    |                                    |
    | ### Investment Overview            |
    | Your annual investment: $48,000    |
    | Term total: $144,000 (3 years)     |
    |                                    |
    | ### Your Savings                   |
    | - 22% discount off list price      |
    | - Annual savings: $13,500          |
    | - Total savings over 3 years:      |
    |   $40,500                          |
    |                                    |
    | ### What's Included               |
    | - 50 seats of Sales Cloud         |
    | - 50 seats of Service Cloud       |
    | - Einstein Analytics              |
    |                                    |
    | ### Salesforce’s Incentives and Concessions |
    | [AI-generated value proposition]   |
    |------------------------------------|
    | [📋 Copy] [⟳ Regenerate] [✕ Close] |
    +------------------------------------+
```

---

## Technical Architecture

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/generate-deal-summary/index.ts` | Edge function to generate summary via Lovable AI |
| `src/components/deals/DealSummaryGenerator.tsx` | Main dialog component with prompt input and output display |
| `src/hooks/useDealSummary.ts` | Hook to manage summary generation state and API calls |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/DealDetail.tsx` | Add floating summary button and import generator component |
| `supabase/config.toml` | Register the new edge function |

---

## Component: DealSummaryGenerator

### Props
```typescript
interface DealSummaryGeneratorProps {
  deal: Deal;
  scenarios: Scenario[];
  lineItemsByScenario: Record<string, LineItem[]>;
}
```

### Features
- **Trigger Button**: Floating action button positioned at bottom-right of the page, styled to match the app's primary color
- **Dialog/Sheet**: Opens a bottom sheet (mobile) or dialog (desktop) with:
  - Optional text input for custom prompts/focus areas
  - Generate button with loading state
  - Formatted markdown output display
  - Copy to clipboard button
  - Regenerate button
- **Keyboard shortcut**: Consider adding Cmd/Ctrl+G for power users

### UI States
1. **Idle**: Shows prompt input and generate button
2. **Generating**: Loading spinner, disabled inputs
3. **Success**: Rendered summary with copy/regenerate actions
4. **Error**: Error message with retry option

---

## Edge Function: generate-deal-summary

### Endpoint
`POST /functions/v1/generate-deal-summary`

### Request Body
```typescript
{
  deal_id: string;
  prompt?: string; // Optional user customization
}
```

### Logic Flow
1. Authenticate user via JWT
2. Fetch deal, scenarios, and line items from database
3. Calculate totals for each scenario
4. Build structured context for AI
5. Call Lovable AI with formatted prompt
6. Return generated summary

### AI Prompt Strategy
The prompt will be designed to produce human-friendly, customer-facing content:

```text
System: You are creating a deal summary for a sales account executive to share 
with their customer. Write in clear, professional language that emphasizes 
value and savings. Format with markdown headers and bullet points for 
easy reading.

Context:
- Deal: {deal.name}
- View: Customer-facing
- Scenarios: {scenario summaries with products, quantities, pricing}
- Totals: {list price, net price, discount, term, savings}

User prompt (if provided): {optional customization}

Generate a summary that includes:
1. Investment Overview - Clear statement of costs
2. Your Savings - Quantified discount and savings
3. What's Included - Products and quantities
4. Value Proposition - Why this deal makes sense

Keep it concise, positive, and focused on customer value.
```

### Response Format
```typescript
{
  success: boolean;
  summary?: string; // Markdown formatted
  error?: string;
}
```

---

## Hook: useDealSummary

```typescript
interface UseDealSummaryOptions {
  dealId: string;
  onSuccess?: (summary: string) => void;
  onError?: (error: string) => void;
}

interface UseDealSummaryReturn {
  generate: (prompt?: string) => Promise<void>;
  summary: string | null;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
}
```

### Implementation
- Uses `fetch` to call the edge function (not supabase.functions.invoke for streaming support in future)
- Manages loading, error, and success states
- Stores last generated summary in state
- Handles 429/402 rate limit errors with user-friendly messages

---

## UI Implementation Details

### Floating Action Button
```tsx
<Button
  onClick={openDialog}
  className="fixed bottom-6 right-6 h-12 px-5 shadow-lg rounded-full z-50"
>
  <Sparkles className="h-4 w-4 mr-2" />
  Generate Summary
</Button>
```

### Summary Output Styling
- Use prose-like formatting for readability
- Left-aligned text, generous line height
- Clear section headers
- Bullet points for line items
- Highlighted savings figures (bold or accent color)

### Copy to Clipboard
```typescript
const handleCopy = async () => {
  await navigator.clipboard.writeText(summary);
  toast({ title: "Copied to clipboard" });
};
```

---

## Data Preparation for AI

The edge function will prepare a structured summary of deal data:

```typescript
interface DealContext {
  dealName: string;
  scenarios: Array<{
    name: string;
    products: Array<{
      name: string;
      quantity: number;
      netMonthly: number;
      netAnnual: number;
      discountPercent: number;
    }>;
    totals: {
      listAnnual: number;
      netAnnual: number;
      netTerm: number;
      blendedDiscount: number;
      annualSavings: number;
      termSavings: number;
    };
  }>;
}
```

---

## Considerations

### Rate Limiting
- Display friendly error if user hits rate limits
- Consider debouncing the generate button

### Content Safety
- AI output is for internal sales use, so content filtering is minimal
- Summary is ephemeral (not saved to database)

### Future Enhancements
- Save favorite summaries
- Export summary as PDF
- Streaming response for real-time rendering
- Multiple summary styles (executive brief, detailed breakdown)

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/generate-deal-summary/index.ts` | Create | AI summary generation endpoint |
| `src/components/deals/DealSummaryGenerator.tsx` | Create | UI component for summary generation |
| `src/hooks/useDealSummary.ts` | Create | State management hook |
| `src/pages/DealDetail.tsx` | Modify | Add floating button and integrate generator |
| `supabase/config.toml` | Modify | Register new edge function |

---

## Technical Notes

### Why Edge Function?
- Keeps AI prompts and logic server-side
- Protects API key and rate limiting logic
- Allows fetching deal data with elevated permissions if needed
- Can be enhanced with streaming in future

### Security
- Uses existing JWT authentication
- Only fetches deals belonging to the authenticated user (existing RLS)
- No data persistence - summary is generated on-demand

### Model Selection
- Uses `google/gemini-2.5-flash` for fast, cost-effective generation
- Suitable for the structured summarization task

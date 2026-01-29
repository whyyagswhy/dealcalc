

# Deal Scenario Calculator - Production-Grade Implementation Plan

## Project Overview
A responsive web app for Salesforce AEs to model and compare unlimited pricing scenarios side-by-side. Features dual viewing modes (Internal/Customer) at deal level, Supabase persistence with cookie-based auth, and clean PNG/CSV export options for customer presentations.

**Supabase connector is already configured - no connection/setup steps needed.**

---

## Milestone 1: Auth & Database Foundation
**Goal:** Establish authentication and complete database schema with RLS.

### Features

**Authentication:**
- Login/signup page with email/password (email is username, no special password restrictions)
- `@supabase/ssr` cookie-based sessions (not deprecated auth-helpers)
- Protected routes with server-side session checks
- Redirect unauthenticated users to login
- Authenticated user context available throughout app

**Database Schema:**

```sql
-- Deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_mode TEXT NOT NULL DEFAULT 'monthly' CHECK (display_mode IN ('monthly', 'annual')),
  view_mode TEXT NOT NULL DEFAULT 'internal' CHECK (view_mode IN ('internal', 'customer')),
  enable_existing_volume BOOLEAN NOT NULL DEFAULT false,
  scenario_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scenarios table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  display_override TEXT NULL CHECK (display_override IS NULL OR display_override IN ('monthly', 'annual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Line items table
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  list_unit_price NUMERIC NOT NULL CHECK (list_unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity >= 0),
  term_months INT NOT NULL DEFAULT 12 CHECK (term_months > 0),
  discount_percent NUMERIC NULL CHECK (discount_percent >= 0 AND discount_percent <= 1),
  net_unit_price NUMERIC NULL CHECK (net_unit_price >= 0),
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('net_new', 'add_on')),
  existing_volume INT NULL CHECK (existing_volume IS NULL OR existing_volume >= 0),
  existing_net_price NUMERIC NULL CHECK (existing_net_price IS NULL OR existing_net_price >= 0),
  existing_term_months INT NULL CHECK (existing_term_months IS NULL OR existing_term_months > 0),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite indexes for performance
CREATE INDEX idx_deals_user_updated ON deals(user_id, updated_at DESC);
CREATE INDEX idx_scenarios_deal_position ON scenarios(deal_id, position);
CREATE INDEX idx_line_items_scenario_position ON line_items(scenario_id, position);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER line_items_updated_at BEFORE UPDATE ON line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Scenario count trigger (denormalized for list performance)
CREATE OR REPLACE FUNCTION update_deal_scenario_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE deals SET scenario_count = scenario_count + 1 WHERE id = NEW.deal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE deals SET scenario_count = scenario_count - 1 WHERE id = OLD.deal_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenarios_count_trigger
  AFTER INSERT OR DELETE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_deal_scenario_count();
```

**Row Level Security (explicit per-table, authenticated role, IN/ANY style):**

```sql
-- Enable RLS on all tables
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- Deals policies: user_id = auth.uid()
CREATE POLICY "Users can select own deals" ON deals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own deals" ON deals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own deals" ON deals
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own deals" ON deals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Scenarios policies: deal must be owned by user (IN subquery)
CREATE POLICY "Users can select own scenarios" ON scenarios
  FOR SELECT TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own scenarios" ON scenarios
  FOR INSERT TO authenticated
  WITH CHECK (deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own scenarios" ON scenarios
  FOR UPDATE TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own scenarios" ON scenarios
  FOR DELETE TO authenticated
  USING (deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid()));

-- Line items policies: scenario's deal must be owned by user (nested IN subquery)
CREATE POLICY "Users can select own line_items" ON line_items
  FOR SELECT TO authenticated
  USING (scenario_id IN (
    SELECT id FROM scenarios WHERE deal_id IN (
      SELECT id FROM deals WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can insert own line_items" ON line_items
  FOR INSERT TO authenticated
  WITH CHECK (scenario_id IN (
    SELECT id FROM scenarios WHERE deal_id IN (
      SELECT id FROM deals WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can update own line_items" ON line_items
  FOR UPDATE TO authenticated
  USING (scenario_id IN (
    SELECT id FROM scenarios WHERE deal_id IN (
      SELECT id FROM deals WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can delete own line_items" ON line_items
  FOR DELETE TO authenticated
  USING (scenario_id IN (
    SELECT id FROM scenarios WHERE deal_id IN (
      SELECT id FROM deals WHERE user_id = auth.uid()
    )
  ));
```

### Acceptance Criteria
- [ ] Can sign up, log in, and log out with email/password
- [ ] Session persists across page refresh (cookie-based via @supabase/ssr)
- [ ] Unauthenticated users redirected to login; cannot access app pages
- [ ] All tables created with CHECK constraints and NOT NULL where specified
- [ ] All three updated_at triggers fire correctly on UPDATE
- [ ] Scenario count trigger maintains deals.scenario_count accurately
- [ ] Composite indexes created for (user_id, updated_at DESC), (deal_id, position), (scenario_id, position)
- [ ] RLS enabled on all tables; policies scoped to `authenticated` role
- [ ] RLS verified: user A cannot see/modify user B's deals/scenarios/line_items

---

## Milestone 2: Deals List & Basic Deal Page
**Goal:** Build deals management with pagination, search, and virtualization.

### Features

**Deals List Page:**
- Empty state with "Create Deal" CTA
- Paginated/infinite scroll loading (never fetch all deals)
- Query selects only list-view columns: id, name, updated_at, scenario_count
- Virtualized list for smooth scrolling at 500-1000 deals
- Sort by updated_at DESC (recent first)
- Search by deal name (debounced, server-side filter)
- Deal cards show: name, last updated, scenario count

**Deal Detail Page:**
- Deal header with editable name
- Back navigation to deals list
- Empty scenario area (placeholder)

**Autosave Infrastructure:**
- Dirty state aggregator per deal
- Debounced persistence (400ms)
- Batch updates (not per-keystroke-per-field)
- Optimistic UI updates
- Save status indicator (saved/saving/error with retry)
- No offline queue (error state + retry only)

### Acceptance Criteria
- [ ] Deals list uses pagination or infinite scroll; never loads all deals
- [ ] Query selects only id, name, updated_at, scenario_count
- [ ] List is virtualized and scrolls smoothly with 1000 deals
- [ ] Search filters by name server-side with debounce
- [ ] Deals sorted by updated_at DESC
- [ ] Creating a deal persists immediately and appears in list
- [ ] Deal name edits trigger debounced autosave (single batch)
- [ ] Save status shows: saved ✓, saving..., error (retry button)
- [ ] Same deals appear when logging in from different device

---

## Milestone 3: Single Scenario with Line Items
**Goal:** Build complete line item entry experience.

### Features

**Scenario Card:**
- Editable scenario name
- Add line item button

**Line Item Table Columns:**
- Product name (free text, placeholder "e.g., Sales Cloud")
- List unit price monthly (placeholder "e.g., 150")
- Quantity (placeholder "e.g., 25")
- Term months (default 12, placeholder "e.g., 24")
- Input mode: Discount % OR Net unit price
  - Entering discount auto-computes net (and vice versa)
  - One field editable, other read-only (gray background)
- Revenue type toggle (Net New / Add-on)

**Line Item Actions:**
- Add new line item
- Delete line item (with confirmation)
- Clone line item
- Reorder lines (drag or arrow buttons)
- Copy to another scenario (dropdown, enabled when multi-scenario exists)

**Persistence:**
- Line item changes flow through deal dirty state aggregator
- Debounced batch save (400ms)
- Use upsert for line_items updates

### Acceptance Criteria
- [ ] Can add line items with all fields
- [ ] Discount ↔ Net price auto-computes correctly
- [ ] Read-only computed field has gray background, no focus state
- [ ] Line items can be added, deleted, cloned, reordered
- [ ] All inputs have placeholder examples
- [ ] Changes persist via debounced batch upsert
- [ ] Position order maintained after refresh

---

## Milestone 4: Calculations & Scenario Summary
**Goal:** Implement all pricing calculations with pure functions and unit tests.

### Features

**Calculation Module (`/lib/calculations.ts`):**

All pure functions with unit tests:

```typescript
// Core line item calculations
calculateNetFromDiscount(listPrice: number, discount: number): number
calculateDiscountFromNet(listPrice: number, netPrice: number): number
calculateLineMonthly(netUnitPrice: number, quantity: number): number
calculateLineAnnual(netMonthly: number): number // Always: netMonthly * 12
calculateLineTerm(netMonthly: number, termMonths: number): number

// ACV calculations (locked spec)
// ACV = NetMonthly * 12 (always annualized to 12 months)
calculateACV(netMonthly: number): number

// Commissionable ACV
// Net New: CommissionableACV = NetAnnual
// Add-on: CommissionableACV = max(NetAnnual - ExistingAnnual, 0)
calculateCommissionableACV(
  revenueType: 'net_new' | 'add_on',
  netAnnual: number,
  existingAnnual: number
): number

// Scenario aggregates
calculateScenarioTotals(lineItems: LineItem[]): ScenarioTotals
calculateBlendedDiscount(termList: number, termNet: number): number
calculateTotalSavings(termList: number, termNet: number): number
```

**Selector Hooks:**
- `useLineItemCalculations(lineItem)` → all derived values
- `useScenarioTotals(scenario)` → aggregated totals
- Derived values never computed in components directly

**Display Mode Logic:**
- Monthly vs Annual toggle affects displayed values only
- Underlying math unchanged (ACV always = NetMonthly × 12)
- Term totals always shown regardless of display mode

**Sticky Scenario Summary Header:**
- Total List / Total Net (per display mode: monthly or annual)
- Term totals (list and net) - always shown
- Total savings (term list - term net)
- Blended discount % (weighted by term values)
- (Internal View only) Total commissionable ACV, Total incremental ACV

### Acceptance Criteria
- [ ] All calculation functions in `/lib/calculations.ts`
- [ ] Unit tests cover normal cases, edge cases, zero values
- [ ] ACV = NetMonthly × 12 (not prorated by term)
- [ ] Net New commissionable = NetAnnual
- [ ] Add-on commissionable = max(NetAnnual - ExistingAnnual, 0)
- [ ] Selector hooks provide derived values; components don't compute
- [ ] Summary header sticks when scrolling line items
- [ ] Monthly/Annual toggle changes displayed values correctly
- [ ] Blended discount weighted correctly by term totals

---

## Milestone 5: Baseline (Existing Volume) for Add-ons
**Goal:** Support expansion/add-on pricing against existing contracts.

### Features

**Deal-Level Toggle:**
- "Enable Existing Volume" in deal settings
- Persists with deal

**Baseline Fields (for Add-on lines in Internal View only):**
- Existing volume
- Existing net unit price (monthly)
- Existing term months (defaults to line term; display/export only, not used in ACV calc)

**Visibility Rules:**
- Baseline UI hidden when:
  - "Enable Existing Volume" toggle is OFF, OR
  - Customer View is active
- Only shown for revenue_type = 'add_on'

**Calculation Integration:**
- Existing Annual = existing_net_price × existing_volume × 12
- Plugs into commissionable ACV calc for add-ons

**Visual Distinction:**
- Net New vs Add-on rows have subtle visual indicator (left border color or badge)

### Acceptance Criteria
- [ ] Global toggle shows/hides baseline fields across all scenarios
- [ ] Baseline only appears for Add-on lines in Internal View
- [ ] Existing term months stored but not used in ACV (ACV always uses 12)
- [ ] Baseline values persist and restore correctly
- [ ] Add-on commissionable ACV calculation uses existing values correctly
- [ ] Net New vs Add-on rows visually distinguishable

---

## Milestone 6: Multi-Scenario Support
**Goal:** Enable unlimited side-by-side scenario comparison.

### Features

- Add scenario button (creates with default name "Scenario N")
- Horizontal scroll container for multiple scenarios
- Clone scenario (copy with "(Copy)" suffix, including all line items)
- Rename scenario inline
- Reorder scenarios (drag-and-drop or arrow buttons)
- Delete scenario (confirmation modal)
- "Copy line item to scenario" dropdown

### Acceptance Criteria
- [ ] Can create, clone, rename, reorder, delete scenarios
- [ ] Cloning copies all line items with positions
- [ ] Horizontal scroll smooth on desktop and tablet
- [ ] Scenario order persists via position column
- [ ] Copy line item to another scenario works correctly
- [ ] deals.scenario_count maintained by trigger

---

## Milestone 7: View & Display Mode Toggles
**Goal:** Implement deterministic view modes at deal level.

### Features

**Deal Settings Panel:**
- Display mode: Monthly vs Annual (deal-level default)
- View mode: Internal vs Customer (deal-level global, applies to ALL scenarios)
- Enable Existing Volume toggle

**Per-Scenario Override:**
- Display mode only (Monthly/Annual)
- Inherits deal default if null

**Customer View Behavior (Display-Only, Screenshot-Ready):**

Hides completely:
- Baseline fields (existing volume, price, term)
- Revenue type column
- Commissionable ACV in summary
- Incremental ACV in summary

Hides edit chrome:
- Drag handles
- Add/delete/clone buttons
- Input borders (fields appear as plain text)
- Reorder controls

Result: Clean quote-style view suitable for screenshots

**Internal View:**
- Fully editable
- All fields and controls visible

### Acceptance Criteria
- [ ] Display mode toggle affects all displayed monetary values
- [ ] View mode is deal-level; one toggle changes all scenarios
- [ ] Customer View hides all internal-only fields
- [ ] Customer View hides all edit controls and input styling
- [ ] Customer View looks like a clean quote/presentation
- [ ] Internal View is fully editable with all controls
- [ ] Settings persist with deal

---

## Milestone 8: PNG Export
**Goal:** Enable clean PNG exports for customer sharing.

### Features

**Library:** html-to-image (or equivalent)

**Off-Screen Render Container:**
- Hidden container sized for consistent output
- Renders full content (not viewport-clipped)

**Per-Scenario Export:**
- Button in scenario header: "Export PNG"
- Captures: scenario title, sticky summary, ALL line item rows
- Single tall PNG (no pagination)
- Respects current view mode (Customer View hides internal fields + edit chrome)
- Filename: `{DealName} - {ScenarioName} - {YYYY-MM-DD}.png`

**Full-Deal Export:**
- Button in deal header: "Export Deal PNG"
- Dedicated export layout:
  - Deal title and timestamp
  - Display mode indicator (Monthly/Annual)
  - All scenarios stacked vertically (no horizontal scroll)
  - Each scenario: full summary + all line items
- Respects Customer vs Internal View
- Filename: `{DealName} - Full Deal - {YYYY-MM-DD}.png`

### Acceptance Criteria
- [ ] Per-scenario PNG captures ALL rows, not just viewport
- [ ] Full-deal PNG stacks scenarios vertically with all rows
- [ ] Customer View exports hide internal fields AND edit controls
- [ ] Internal View exports show all data
- [ ] Off-screen render produces consistent dimensions
- [ ] Filenames follow naming convention with date
- [ ] Works in light mode (dark mode deferred)

---

## Milestone 9: CSV Export
**Goal:** Enable data export for spreadsheet analysis.

### Features

**Export Modal:**
- Multi-select which scenarios to include
- Choose export type: Customer CSV or Internal CSV

**Customer CSV Columns:**
```
DealName, ScenarioName, ProductName, ListUnitPriceMonthly, Quantity, TermMonths, DiscountPct, NetUnitPriceMonthly, ListMonthly, NetMonthly, ListAnnual, NetAnnual, ListTerm, NetTerm
```

**Internal CSV Additional Columns:**
```
RevenueType, ExistingVolume, ExistingNetUnitPriceMonthly, ExistingTermMonths, IncrementalACV, CommissionableACV
```

**Scenario Totals Section (per scenario):**
```
ScenarioName, TotalListTerm, TotalNetTerm, TotalSavingsTerm, BlendedDiscountPctTerm, TotalNetAnnual, TotalCommissionableACV (internal only)
```

**Filename:** `{DealName} - {Customer|Internal} - {YYYY-MM-DD}.csv`

### Acceptance Criteria
- [ ] Can select subset of scenarios for export
- [ ] Customer CSV excludes all internal-only columns
- [ ] Internal CSV includes all columns
- [ ] Scenario totals rows included after each scenario's line items
- [ ] Numbers formatted correctly (no string coercion issues)
- [ ] CSV opens correctly in Excel and Google Sheets
- [ ] Filename indicates Customer vs Internal

---

## Milestone 10: Polish & Responsive Design
**Goal:** Production-ready UX across devices.

### Features

**Responsive Layout:**
- Desktop: horizontal scenario scroll
- Tablet: horizontal scroll with touch
- Mobile: collapsible scenario cards or swipe navigation
- Touch targets ≥ 44px

**Empty States:**
- Deals list empty state with illustration
- New deal empty state

**Keyboard Navigation:**
- Tab through line item inputs
- Enter to add new line
- Escape to cancel/close modals

**Accessibility:**
- Labels on all inputs
- ARIA attributes for dynamic content
- Focus management for modals

**Error Handling:**
- Autosave retry on failure
- Clear error messages
- No offline queue (show error + retry only)

**Dark Mode (deferred or v1.1):**
- If included: ensure exports render correctly in dark mode
- Otherwise: light mode only for v1

### Acceptance Criteria
- [ ] Works well on iPad and large phones
- [ ] Touch targets meet 44px minimum
- [ ] Keyboard navigation fully functional
- [ ] Screen reader announces key interactions
- [ ] Autosave errors show clear message with retry
- [ ] No offline queue; graceful error handling only
- [ ] All visual states polished and consistent

---

## Technical Architecture Summary

**Auth:** `@supabase/ssr` cookie-based sessions, server-side route protection

**State Management:**
- React Context + useReducer for deal state
- Dirty state aggregator for batched autosave
- Selector hooks for derived values

**Persistence:**
- Supabase Postgres (already connected)
- Debounced batch saves (400ms)
- Upsert for line_items
- React Query for fetching with cache

**Calculations:**
- Pure functions in `/lib/calculations.ts`
- Unit tests in `/lib/calculations.test.ts`
- No business logic in components

**Exports:**
- `html-to-image` for PNG
- Off-screen render container
- Manual CSV generation

---

## Explicitly Out of Scope for v1

- Multi-currency
- Tiered/volume pricing
- Ramps or year-over-year changes
- Product catalogs or SKU libraries
- One-time fees
- Approval workflows
- JSON import/export
- Share links
- Offline sync queue
- Dark mode (deferred to v1.1)


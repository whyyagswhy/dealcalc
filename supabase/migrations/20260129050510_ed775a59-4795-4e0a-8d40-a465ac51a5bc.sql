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

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Updated_at triggers for all tables
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scenarios_updated_at BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER line_items_updated_at BEFORE UPDATE ON line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Scenario count trigger function (denormalized for list performance)
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
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER scenarios_count_trigger
  AFTER INSERT OR DELETE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_deal_scenario_count();

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
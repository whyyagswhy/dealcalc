// Database types for the Deal Scenario Calculator

export type RevenueType = 'net_new' | 'add_on';
export type DisplayMode = 'monthly' | 'annual';
export type ViewMode = 'internal' | 'customer';

export interface Deal {
  id: string;
  user_id: string;
  name: string;
  display_mode: DisplayMode;
  view_mode: ViewMode;
  enable_existing_volume: boolean;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  deal_id: string;
  name: string;
  position: number;
  display_override: DisplayMode | null;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: string;
  scenario_id: string;
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
  revenue_type: RevenueType;
  existing_volume: number | null;
  existing_net_price: number | null;
  existing_term_months: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// For creating new records (omit auto-generated fields)
export type CreateDeal = Pick<Deal, 'user_id' | 'name'> & Partial<Pick<Deal, 'display_mode' | 'view_mode' | 'enable_existing_volume'>>;
export type CreateScenario = Pick<Scenario, 'deal_id' | 'name'> & Partial<Pick<Scenario, 'position' | 'display_override'>>;
export type CreateLineItem = Pick<LineItem, 'scenario_id' | 'product_name' | 'list_unit_price' | 'quantity' | 'revenue_type'> & 
  Partial<Pick<LineItem, 'term_months' | 'discount_percent' | 'net_unit_price' | 'existing_volume' | 'existing_net_price' | 'existing_term_months' | 'position'>>;

// For deal list view (minimal columns for performance)
export interface DealListItem {
  id: string;
  name: string;
  updated_at: string;
  scenario_count: number;
}

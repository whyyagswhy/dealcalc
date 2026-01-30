-- Create price_book_products table for Salesforce price book
CREATE TABLE public.price_book_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  category text NOT NULL,
  edition text,
  annual_list_price numeric NOT NULL,
  monthly_list_price numeric GENERATED ALWAYS AS (annual_list_price / 12) STORED,
  pricing_unit text NOT NULL DEFAULT 'per_user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for search performance
CREATE INDEX idx_price_book_products_name ON public.price_book_products USING gin (to_tsvector('english', product_name));
CREATE INDEX idx_price_book_products_category ON public.price_book_products (category);

-- Enable RLS
ALTER TABLE public.price_book_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read
CREATE POLICY "Authenticated users can read price book"
ON public.price_book_products
FOR SELECT
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_price_book_products_updated_at
BEFORE UPDATE ON public.price_book_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Seed with Salesforce price book data (from Core Price List v1.1)
INSERT INTO public.price_book_products (product_name, category, edition, annual_list_price, pricing_unit) VALUES
-- Sales Cloud Products
('Sales Cloud - Agentforce 1 Edition', 'Sales Cloud', 'Agentforce 1', 6600, 'per_user'),
('Sales Cloud - Einstein 1 Edition', 'Sales Cloud', 'Einstein 1', 6000, 'per_user'),
('Sales Cloud - Unlimited Edition', 'Sales Cloud', 'Unlimited', 3960, 'per_user'),
('Sales Cloud - Enterprise Edition', 'Sales Cloud', 'Enterprise', 2100, 'per_user'),
('Sales Cloud - Professional Edition', 'Sales Cloud', 'Professional', 960, 'per_user'),
('Sales Cloud - Essentials Edition', 'Sales Cloud', 'Essentials', 300, 'per_user'),

-- Service Cloud Products
('Service Cloud - Agentforce 1 Edition', 'Service Cloud', 'Agentforce 1', 6600, 'per_user'),
('Service Cloud - Einstein 1 Edition', 'Service Cloud', 'Einstein 1', 6000, 'per_user'),
('Service Cloud - Unlimited Edition', 'Service Cloud', 'Unlimited', 3960, 'per_user'),
('Service Cloud - Enterprise Edition', 'Service Cloud', 'Enterprise', 2100, 'per_user'),
('Service Cloud - Professional Edition', 'Service Cloud', 'Professional', 960, 'per_user'),
('Service Cloud - Essentials Edition', 'Service Cloud', 'Essentials', 300, 'per_user'),

-- Data Cloud Products
('Data Cloud - Enterprise Edition', 'Data Cloud', 'Enterprise', 2160000, 'per_org'),
('Data Cloud - Growth Edition', 'Data Cloud', 'Growth', 1080000, 'per_org'),
('Data Cloud - Starter Edition', 'Data Cloud', 'Starter', 540000, 'per_org'),
('Data Cloud for Marketing', 'Data Cloud', NULL, 180000, 'per_org'),
('Data Cloud for Commerce', 'Data Cloud', NULL, 180000, 'per_org'),

-- Marketing Cloud Products
('Marketing Cloud - Account Engagement Plus', 'Marketing Cloud', 'Plus', 15000, 'per_org'),
('Marketing Cloud - Account Engagement Growth', 'Marketing Cloud', 'Growth', 30000, 'per_org'),
('Marketing Cloud - Account Engagement Advanced', 'Marketing Cloud', 'Advanced', 48000, 'per_org'),
('Marketing Cloud - Engagement', 'Marketing Cloud', NULL, 4800, 'per_user'),
('Marketing Cloud - Personalization', 'Marketing Cloud', NULL, 120000, 'per_org'),

-- Commerce Cloud Products
('Commerce Cloud - B2C Commerce', 'Commerce Cloud', 'B2C', 60000, 'per_org'),
('Commerce Cloud - B2B Commerce', 'Commerce Cloud', 'B2B', 60000, 'per_org'),
('Commerce Cloud - Order Management', 'Commerce Cloud', NULL, 2400, 'per_user'),

-- Platform Products
('Platform - Unlimited Edition', 'Platform', 'Unlimited', 3000, 'per_user'),
('Platform - Enterprise Edition', 'Platform', 'Enterprise', 1500, 'per_user'),
('Platform - Starter', 'Platform', 'Starter', 300, 'per_user'),
('Lightning Platform Plus', 'Platform', 'Plus', 1200, 'per_user'),
('Heroku Enterprise', 'Platform', 'Enterprise', 48000, 'per_org'),

-- Slack Products
('Slack - Business+', 'Slack', 'Business+', 180, 'per_user'),
('Slack - Enterprise Grid', 'Slack', 'Enterprise Grid', 348, 'per_user'),
('Slack Sales Elevate', 'Slack', NULL, 720, 'per_user'),

-- Experience Cloud Products
('Experience Cloud - Customer Community', 'Experience Cloud', 'Customer', 24, 'per_user'),
('Experience Cloud - Customer Community Plus', 'Experience Cloud', 'Customer Plus', 84, 'per_user'),
('Experience Cloud - Partner Community', 'Experience Cloud', 'Partner', 132, 'per_user'),
('Experience Cloud - External Apps', 'Experience Cloud', 'External Apps', 180, 'per_user'),

-- Analytics Products
('CRM Analytics - Growth', 'Analytics', 'Growth', 1560, 'per_user'),
('CRM Analytics - Plus', 'Analytics', 'Plus', 1800, 'per_user'),
('Tableau - Creator', 'Analytics', 'Creator', 900, 'per_user'),
('Tableau - Explorer', 'Analytics', 'Explorer', 504, 'per_user'),
('Tableau - Viewer', 'Analytics', 'Viewer', 180, 'per_user'),

-- Einstein AI Products
('Einstein for Sales', 'Einstein', 'Sales', 600, 'per_user'),
('Einstein for Service', 'Einstein', 'Service', 600, 'per_user'),
('Einstein Copilot', 'Einstein', NULL, 600, 'per_user'),
('Einstein GPT', 'Einstein', NULL, 600, 'per_user'),

-- Field Service Products
('Field Service - Contractor', 'Field Service', 'Contractor', 600, 'per_user'),
('Field Service - Dispatcher', 'Field Service', 'Dispatcher', 1800, 'per_user'),
('Field Service - Mobile', 'Field Service', 'Mobile', 1800, 'per_user'),
('Field Service - Technician', 'Field Service', 'Technician', 1800, 'per_user'),

-- Revenue Cloud Products
('Revenue Cloud - CPQ', 'Revenue Cloud', 'CPQ', 900, 'per_user'),
('Revenue Cloud - Billing', 'Revenue Cloud', 'Billing', 600, 'per_user'),
('Revenue Cloud - Advanced', 'Revenue Cloud', 'Advanced', 1800, 'per_user'),

-- Industry Cloud Products
('Health Cloud', 'Industry Cloud', 'Health', 4200, 'per_user'),
('Financial Services Cloud', 'Industry Cloud', 'Financial', 3600, 'per_user'),
('Manufacturing Cloud', 'Industry Cloud', 'Manufacturing', 3600, 'per_user'),
('Consumer Goods Cloud', 'Industry Cloud', 'Consumer Goods', 3600, 'per_user'),
('Automotive Cloud', 'Industry Cloud', 'Automotive', 3600, 'per_user'),
('Communications Cloud', 'Industry Cloud', 'Communications', 3600, 'per_user'),
('Media Cloud', 'Industry Cloud', 'Media', 3600, 'per_user'),
('Energy & Utilities Cloud', 'Industry Cloud', 'Energy', 3600, 'per_user'),
('Public Sector Solutions', 'Industry Cloud', 'Public Sector', 3600, 'per_user'),
('Nonprofit Cloud', 'Industry Cloud', 'Nonprofit', 432, 'per_user'),
('Education Cloud', 'Industry Cloud', 'Education', 600, 'per_user'),

-- MuleSoft Products
('MuleSoft Anypoint Platform - Gold', 'MuleSoft', 'Gold', 84000, 'per_org'),
('MuleSoft Anypoint Platform - Platinum', 'MuleSoft', 'Platinum', 150000, 'per_org'),
('MuleSoft Anypoint Platform - Titanium', 'MuleSoft', 'Titanium', 300000, 'per_org'),
('MuleSoft Composer', 'MuleSoft', 'Composer', 24000, 'per_org'),

-- Security Products
('Salesforce Shield', 'Security', 'Shield', 3600, 'per_user'),
('Event Monitoring', 'Security', NULL, 600, 'per_user'),
('Field Audit Trail', 'Security', NULL, 600, 'per_user'),
('Platform Encryption', 'Security', NULL, 600, 'per_user'),

-- Enablement Products
('Sales Enablement', 'Enablement', 'Sales', 300, 'per_user'),
('Service Enablement', 'Enablement', 'Service', 300, 'per_user'),

-- Additional Add-ons
('Inbox', 'Add-ons', NULL, 300, 'per_user'),
('Salesforce Maps', 'Add-ons', NULL, 900, 'per_user'),
('Salesforce Surveys', 'Add-ons', NULL, 72, 'per_user'),
('Quip', 'Add-ons', NULL, 120, 'per_user'),
('Knowledge', 'Add-ons', NULL, 900, 'per_user'),
('Live Agent', 'Add-ons', NULL, 900, 'per_user'),
('High Velocity Sales', 'Add-ons', NULL, 900, 'per_user'),
('Pardot', 'Add-ons', NULL, 15000, 'per_org'),
('Social Studio', 'Add-ons', NULL, 12000, 'per_org');
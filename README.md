# Deal Scenario Calculator

A modern web application for sales teams to model, compare, and present pricing scenarios for customer deals.

## Overview

Deal Scenario Calculator enables sales professionals to:
- Create and manage customer deals with multiple pricing scenarios
- Model different pricing structures with line items, discounts, and terms
- Compare scenarios side-by-side to identify optimal pricing strategies
- Export deal summaries as images or CSV files for stakeholder presentations
- Track key metrics including ACV, blended discount, and total savings

## Features

### Deal Management
- Create, edit, and delete deals with automatic cloud sync
- Search and filter deals by name
- Paginated, virtualized list supporting 1000+ deals per user

### Scenario Modeling
- Multiple scenarios per deal for A/B pricing comparison
- Clone scenarios to quickly iterate on pricing options
- Monthly/Annual display toggle at deal, scenario, and line-item levels

### Line Item Configuration
- Flexible product pricing with quantity and term customization
- Bidirectional discount calculation (edit discount % or net price)
- Revenue type classification (Net New vs Add-on)
- Existing volume tracking for add-on calculations

### View Modes
- **Customer View**: Clean presentation for customer-facing discussions
- **Internal View**: Full detail including revenue types, baseline metrics, and commissionable ACV

### Export Capabilities
- PNG image export for presentations and emails
- CSV export for spreadsheet analysis
- Selective scenario export

### Security
- User authentication with email/password and OAuth (Google, Apple)
- Row-level security ensuring users only access their own data
- No sensitive data exposed in client-side code

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment**: Lovable Cloud

## Architecture

### Database Schema

```
deals
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── name (text)
├── display_mode ('monthly' | 'annual')
├── view_mode ('internal' | 'customer')
├── enable_existing_volume (boolean)
└── timestamps

scenarios
├── id (uuid, primary key)
├── deal_id (uuid, references deals)
├── name (text)
├── position (integer, for ordering)
├── display_override (nullable, 'monthly' | 'annual')
├── compare_enabled (boolean)
└── timestamps

line_items
├── id (uuid, primary key)
├── scenario_id (uuid, references scenarios)
├── product_name (text)
├── list_unit_price (numeric)
├── quantity (integer)
├── term_months (integer)
├── discount_percent (numeric, nullable)
├── net_unit_price (numeric, nullable)
├── revenue_type ('net_new' | 'add_on')
├── display_override (nullable)
├── existing_volume (integer, nullable)
├── existing_net_price (numeric, nullable)
├── existing_term_months (integer, nullable)
└── timestamps
```

### Security Model

All tables implement Row-Level Security (RLS) policies:
- Users can only SELECT, INSERT, UPDATE, DELETE their own records
- Foreign key constraints cascade deletes appropriately
- No anonymous access; authentication required for all operations

### Performance Optimizations

- **Virtualized Lists**: Efficiently render large deal lists
- **Debounced Autosave**: 500ms delay prevents excessive writes
- **Query Caching**: 30-second stale time reduces redundant fetches
- **Server-Side Pagination**: Loads deals in batches of 20

## Development

### Prerequisites

- Node.js 18+ with npm or bun
- Git

### Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd deal-scenario-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The application requires the following environment variables (automatically configured in Lovable Cloud):

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

### Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test -- --coverage
```

## Deployment

The application is deployed via Lovable Cloud. Simply click "Publish" in the Lovable editor to deploy frontend changes. Backend changes (edge functions, database migrations) deploy automatically.

## Contributing

1. Create a feature branch from `main`
2. Make changes and test locally
3. Push changes - they'll sync to Lovable automatically
4. Create a pull request for review

## License

Private - All rights reserved.

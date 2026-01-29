-- Add display_override column to line_items for per-line monthly/annual toggle
ALTER TABLE public.line_items 
ADD COLUMN display_override text NULL;

-- Add compare_enabled column to scenarios for customer view comparison feature
ALTER TABLE public.scenarios 
ADD COLUMN compare_enabled boolean NOT NULL DEFAULT false;
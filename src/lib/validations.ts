import { z } from 'zod';

// Line item validation schema with business-appropriate limits
export const lineItemSchema = z.object({
  product_name: z.string().trim().max(200, 'Product name must be less than 200 characters'),
  list_unit_price: z.number().min(0, 'Price must be 0 or greater').max(1000000, 'Price cannot exceed $1,000,000').finite(),
  quantity: z.number().int('Quantity must be a whole number').min(0, 'Quantity must be 0 or greater').max(100000, 'Quantity cannot exceed 100,000'),
  term_months: z.number().int('Term must be a whole number').min(1, 'Term must be at least 1 month').max(120, 'Term cannot exceed 120 months'),
  discount_percent: z.number().min(0, 'Discount must be 0 or greater').max(1, 'Discount cannot exceed 100%').nullable(),
  net_unit_price: z.number().min(0, 'Net price must be 0 or greater').max(1000000, 'Net price cannot exceed $1,000,000').finite().nullable(),
  revenue_type: z.enum(['net_new', 'add_on']),
  existing_volume: z.number().int().min(0).max(100000).nullable().optional(),
  existing_net_price: z.number().min(0).max(1000000).finite().nullable().optional(),
  existing_term_months: z.number().int().min(1).max(120).nullable().optional(),
  display_override: z.enum(['monthly', 'annual']).nullable().optional(),
});

// Schema for creating line items (subset of full schema)
export const createLineItemSchema = lineItemSchema.pick({
  product_name: true,
  list_unit_price: true,
  quantity: true,
  term_months: true,
  discount_percent: true,
  net_unit_price: true,
  revenue_type: true,
}).extend({
  scenario_id: z.string().uuid('Invalid scenario ID'),
  position: z.number().int().min(0).optional(),
});

// Schema for updating line items (all fields optional except those validated)
export const updateLineItemSchema = lineItemSchema.partial();

// Schema for imported line items from contract extraction
export const importedLineItemSchema = z.object({
  product_name: z.string().trim().min(1, 'Product name is required').max(200),
  list_unit_price: z.number().min(0).max(1000000).finite(),
  quantity: z.number().int().min(1).max(100000),
  term_months: z.number().int().min(1).max(120),
  discount_percent: z.number().min(0).max(1).nullable(),
  net_unit_price: z.number().min(0).max(1000000).finite().nullable(),
});

// Validate and sanitize line item data, returning errors or clean data
export function validateLineItemUpdate(data: Record<string, unknown>): { 
  success: boolean; 
  data?: z.infer<typeof updateLineItemSchema>; 
  errors?: string[];
} {
  const result = updateLineItemSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { 
    success: false, 
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

// Validate imported line items
export function validateImportedLineItems(items: unknown[]): {
  valid: z.infer<typeof importedLineItemSchema>[];
  errors: string[];
} {
  const valid: z.infer<typeof importedLineItemSchema>[] = [];
  const errors: string[] = [];

  items.forEach((item, index) => {
    const result = importedLineItemSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push(`Item ${index + 1}: ${result.error.errors.map(e => e.message).join(', ')}`);
    }
  });

  return { valid, errors };
}

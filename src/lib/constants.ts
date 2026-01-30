// Application-wide constants

// Validation limits
export const VALIDATION = {
  MAX_PRICE: 1_000_000,
  MAX_QUANTITY: 100_000,
  MIN_TERM: 1,
  MAX_TERM: 120,
  MAX_PRODUCT_NAME_LENGTH: 200,
  MAX_DEAL_NAME_LENGTH: 200,
  MAX_SCENARIO_NAME_LENGTH: 100,
} as const;

// Autosave delays
export const AUTOSAVE = {
  DEFAULT_DELAY: 500,
  FAST_DELAY: 300,
  SLOW_DELAY: 1000,
} as const;

// Query stale times
export const QUERY_STALE_TIME = {
  SHORT: 30_000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 10 * 60 * 1000, // 10 minutes
  VERY_LONG: 30 * 60 * 1000, // 30 minutes
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Admin configuration
export const ADMIN = {
  EMAIL: 'yagnavudathu@gmail.com',
} as const;

// Date formats
export const DATE_FORMAT = {
  FULL: 'MMM d, yyyy \'at\' h:mm a',
  SHORT: 'MMM d, yyyy',
  RELATIVE: true,
} as const;

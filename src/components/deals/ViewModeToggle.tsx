import { cn } from '@/lib/utils';
import type { ViewMode } from '@/lib/types';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  size?: 'sm' | 'xs';
}

export function ViewModeToggle({ 
  value, 
  onChange, 
  size = 'sm',
}: ViewModeToggleProps) {
  const buttonClass = size === 'xs' 
    ? "h-7 px-3 text-xs min-w-[44px]" 
    : "h-8 px-3.5 text-xs min-w-[44px]";

  return (
    <div className="flex items-center rounded-full border border-border p-0.5 bg-muted/30">
      <button
        type="button"
        className={cn(
          buttonClass,
          "rounded-full font-medium transition-all duration-150",
          value === 'internal' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-foreground hover:bg-muted/50"
        )}
        onClick={() => onChange('internal')}
      >
        Internal
      </button>
      <button
        type="button"
        className={cn(
          buttonClass,
          "rounded-full font-medium transition-all duration-150",
          value === 'customer' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-foreground hover:bg-muted/50"
        )}
        onClick={() => onChange('customer')}
      >
        Customer
      </button>
    </div>
  );
}

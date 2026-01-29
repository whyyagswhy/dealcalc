import { cn } from '@/lib/utils';
import type { DisplayMode } from '@/lib/types';

interface DisplayModeToggleProps {
  value: DisplayMode | null;
  onChange: (mode: DisplayMode | null) => void;
  inheritedValue?: DisplayMode;
  size?: 'sm' | 'xs';
  showInherit?: boolean;
}

export function DisplayModeToggle({ 
  value, 
  onChange, 
  inheritedValue,
  size = 'sm',
  showInherit = true,
}: DisplayModeToggleProps) {
  const effectiveValue = value ?? inheritedValue ?? 'monthly';
  const isInheriting = value === null;
  
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
          effectiveValue === 'monthly' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-foreground hover:bg-muted/50",
          isInheriting && effectiveValue === 'monthly' && "opacity-70"
        )}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
      <button
        type="button"
        className={cn(
          buttonClass,
          "rounded-full font-medium transition-all duration-150",
          effectiveValue === 'annual' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "bg-transparent text-foreground hover:bg-muted/50",
          isInheriting && effectiveValue === 'annual' && "opacity-70"
        )}
        onClick={() => onChange('annual')}
      >
        Annual
      </button>
      {showInherit && value !== null && (
        <button
          type="button"
          className={cn(
            buttonClass,
            "rounded-full text-muted-foreground hover:bg-muted/50 transition-all duration-150"
          )}
          onClick={() => onChange(null)}
          title="Reset to inherit from parent"
        >
          ×
        </button>
      )}
    </div>
  );
}

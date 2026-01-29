import { Button } from '@/components/ui/button';
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
    ? "h-6 px-2 text-xs" 
    : "h-7 px-2.5 text-xs";

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          buttonClass,
          effectiveValue === 'monthly' && "bg-background shadow-sm",
          isInheriting && effectiveValue === 'monthly' && "opacity-70"
        )}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          buttonClass,
          effectiveValue === 'annual' && "bg-background shadow-sm",
          isInheriting && effectiveValue === 'annual' && "opacity-70"
        )}
        onClick={() => onChange('annual')}
      >
        Annual
      </Button>
      {showInherit && value !== null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(buttonClass, "text-muted-foreground")}
          onClick={() => onChange(null)}
          title="Reset to inherit from parent"
        >
          ×
        </Button>
      )}
    </div>
  );
}

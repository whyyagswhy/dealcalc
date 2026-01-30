import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';
import { useDiscountThresholds } from '@/hooks/useDiscountThresholds';
import { 
  getApprovalResult, 
  getApprovalLevelColor,
  type ApprovalLevel 
} from '@/lib/discountApproval';
import { cn } from '@/lib/utils';

interface ApprovalLevelBadgeProps {
  productName: string;
  quantity: number;
  discountPercent: number | null; // As decimal (0.20 for 20%)
  className?: string;
  onApplyMaxL4?: (maxDiscount: number) => void; // Callback to apply max L4 discount
}

export function ApprovalLevelBadge({
  productName,
  quantity,
  discountPercent,
  className,
  onApplyMaxL4,
}: ApprovalLevelBadgeProps) {
  const { data: thresholds = [] } = useDiscountThresholds();

  const approvalResult = useMemo(() => {
    return getApprovalResult(thresholds, productName, quantity, discountPercent);
  }, [thresholds, productName, quantity, discountPercent]);

  const colors = getApprovalLevelColor(approvalResult.level);

  const tooltipContent = useMemo(() => {
    if (approvalResult.level === 'N/A') {
      return 'Product not in discount matrix';
    }

    const maxL4 = approvalResult.maxL4Discount;
    const maxL4Percent = maxL4 !== null ? `${(maxL4 * 100).toFixed(1)}%` : 'N/A';

    if (approvalResult.isInstantApproval) {
      return `Approval Level ${approvalResult.level} • Max L4: ${maxL4Percent}`;
    }

    return `Requires escalation (>${maxL4Percent})`;
  }, [approvalResult]);

  // Determine if Max L4 button should be shown and if it's already at max
  const showMaxL4Button = onApplyMaxL4 && approvalResult.maxL4Discount !== null;
  const isAtMaxL4 = discountPercent !== null && 
    approvalResult.maxL4Discount !== null && 
    Math.abs(discountPercent - approvalResult.maxL4Discount) < 0.0001;

  const handleApplyMaxL4 = () => {
    if (approvalResult.maxL4Discount !== null && onApplyMaxL4) {
      onApplyMaxL4(approvalResult.maxL4Discount);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold px-1.5 py-0 h-5 cursor-default',
                colors.bg,
                colors.text,
                colors.border,
                className
              )}
            >
              {approvalResult.level}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
        
        {showMaxL4Button && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleApplyMaxL4}
                disabled={isAtMaxL4}
                className={cn(
                  'h-5 px-1.5 text-[10px] font-semibold gap-0.5',
                  isAtMaxL4 
                    ? 'text-muted-foreground cursor-default' 
                    : 'text-primary hover:text-primary hover:bg-primary/10'
                )}
              >
                <Zap className="h-3 w-3" />
                L4
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isAtMaxL4 
                ? `Already at max L4 (${(approvalResult.maxL4Discount! * 100).toFixed(1)}%)` 
                : `Apply max instant-approval discount (${(approvalResult.maxL4Discount! * 100).toFixed(1)}%)`
              }
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

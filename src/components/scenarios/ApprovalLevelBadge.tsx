import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
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
}

export function ApprovalLevelBadge({
  productName,
  quantity,
  discountPercent,
  className,
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

    return `Requires escalation (>${maxL4Percent}) • Max L4: ${maxL4Percent}`;
  }, [approvalResult]);

  return (
    <TooltipProvider>
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
    </TooltipProvider>
  );
}

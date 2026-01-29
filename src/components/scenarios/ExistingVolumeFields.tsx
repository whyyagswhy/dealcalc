import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExistingVolumeFieldsProps {
  existingVolume: string;
  existingNetPrice: string;
  existingTermMonths: string;
  onExistingVolumeChange: (value: string) => void;
  onExistingNetPriceChange: (value: string) => void;
  onExistingTermMonthsChange: (value: string) => void;
}

export function ExistingVolumeFields({
  existingVolume,
  existingNetPrice,
  existingTermMonths,
  onExistingVolumeChange,
  onExistingNetPriceChange,
  onExistingTermMonthsChange,
}: ExistingVolumeFieldsProps) {
  return (
    <div className="rounded-md border border-dashed border-primary/50 bg-muted/50 p-2">
      <p className="mb-2 text-xs font-medium text-primary">
        Existing Contract (Baseline)
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Existing Qty</Label>
          <Input
            type="number"
            value={existingVolume}
            onChange={(e) => onExistingVolumeChange(e.target.value)}
            placeholder="e.g., 10"
            className="h-8 text-sm"
            min="0"
            step="1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Existing Net/mo</Label>
          <Input
            type="number"
            value={existingNetPrice}
            onChange={(e) => onExistingNetPriceChange(e.target.value)}
            placeholder="e.g., 120"
            className="h-8 text-sm"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Existing Term</Label>
          <Input
            type="number"
            value={existingTermMonths}
            onChange={(e) => onExistingTermMonthsChange(e.target.value)}
            placeholder="e.g., 12"
            className="h-8 text-sm"
            min="1"
            step="1"
          />
        </div>
      </div>
    </div>
  );
}

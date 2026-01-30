import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { DisplayModeToggle } from '@/components/scenarios/DisplayModeToggle';
import { ViewModeToggle } from './ViewModeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Deal, DisplayMode, ViewMode } from '@/lib/types';

interface DealToolbarProps {
  deal: Deal;
  onUpdate: (updates: Partial<Deal>) => void;
}

export function DealToolbar({ deal, onUpdate }: DealToolbarProps) {
  const isMobile = useIsMobile();

  const handleDisplayModeChange = useCallback((value: DisplayMode | null) => {
    if (value) {
      onUpdate({ display_mode: value });
    }
  }, [onUpdate]);

  const handleViewModeChange = useCallback((value: ViewMode) => {
    onUpdate({ view_mode: value });
  }, [onUpdate]);

  const handleEnableExistingVolumeChange = useCallback((checked: boolean) => {
    onUpdate({ enable_existing_volume: checked });
  }, [onUpdate]);

  // Mobile: Only show overflow menu (toggles are rendered separately in the header)
  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="existing-volume-mobile" className="text-sm font-medium">
                Existing Volume
              </Label>
              <p className="text-xs text-muted-foreground">
                Show baseline fields
              </p>
            </div>
            <Switch
              id="existing-volume-mobile"
              checked={deal.enable_existing_volume}
              onCheckedChange={handleEnableExistingVolumeChange}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <DisplayModeToggle
        value={deal.display_mode}
        onChange={handleDisplayModeChange}
        size="sm"
        showInherit={false}
      />
      <ViewModeToggle
        value={deal.view_mode}
        onChange={handleViewModeChange}
        size="sm"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="existing-volume" className="text-sm font-medium">
                Existing Volume
              </Label>
              <p className="text-xs text-muted-foreground">
                Show baseline fields for add-on lines
              </p>
            </div>
            <Switch
              id="existing-volume"
              checked={deal.enable_existing_volume}
              onCheckedChange={handleEnableExistingVolumeChange}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

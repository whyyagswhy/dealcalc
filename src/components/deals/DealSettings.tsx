import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2 } from 'lucide-react';
import type { Deal, DisplayMode, ViewMode } from '@/lib/types';

interface DealSettingsProps {
  deal: Deal;
  onUpdate: (updates: Partial<Deal>) => void;
}

export function DealSettings({ deal, onUpdate }: DealSettingsProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(deal.display_mode);
  const [viewMode, setViewMode] = useState<ViewMode>(deal.view_mode);
  const [enableExistingVolume, setEnableExistingVolume] = useState(deal.enable_existing_volume);

  // Sync from props when deal changes
  useEffect(() => {
    setDisplayMode(deal.display_mode);
    setViewMode(deal.view_mode);
    setEnableExistingVolume(deal.enable_existing_volume);
  }, [deal.display_mode, deal.view_mode, deal.enable_existing_volume]);

  const handleDisplayModeChange = useCallback((value: DisplayMode) => {
    setDisplayMode(value);
    onUpdate({ display_mode: value });
  }, [onUpdate]);

  const handleViewModeChange = useCallback((value: ViewMode) => {
    setViewMode(value);
    onUpdate({ view_mode: value });
  }, [onUpdate]);

  const handleEnableExistingVolumeChange = useCallback((checked: boolean) => {
    setEnableExistingVolume(checked);
    onUpdate({ enable_existing_volume: checked });
  }, [onUpdate]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Settings2 className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Deal Settings</h4>
            <p className="text-sm text-muted-foreground">
              Configure display and view options for this deal.
            </p>
          </div>

          <div className="space-y-4">
            {/* Display Mode */}
            <div className="space-y-2">
              <Label htmlFor="display-mode">Display Mode</Label>
              <Select value={displayMode} onValueChange={handleDisplayModeChange}>
                <SelectTrigger id="display-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-2">
              <Label htmlFor="view-mode">View Mode</Label>
              <Select value={viewMode} onValueChange={handleViewModeChange}>
                <SelectTrigger id="view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Customer view hides internal fields and edit controls.
              </p>
            </div>

            {/* Enable Existing Volume */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="existing-volume">Existing Volume</Label>
                <p className="text-xs text-muted-foreground">
                  Show baseline fields for add-on lines.
                </p>
              </div>
              <Switch
                id="existing-volume"
                checked={enableExistingVolume}
                onCheckedChange={handleEnableExistingVolumeChange}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

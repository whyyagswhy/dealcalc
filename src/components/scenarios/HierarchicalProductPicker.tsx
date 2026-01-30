import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Check, ChevronDown, X } from 'lucide-react';
import { usePriceBook } from '@/hooks/usePriceBook';
import { 
  parseDiscountMatrixName, 
  buildDiscountMatrixName,
  getPriceForSelection,
  searchProducts,
  getDiscountMatrixName,
  type SearchResult,
} from '@/lib/productMapping';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HierarchicalProductPickerProps {
  /** Current product name in discount matrix format: "[Edition] Category" */
  value: string;
  /** Called when product selection changes */
  onChange: (productName: string) => void;
  /** Called when a price book product is selected with its monthly price */
  onPriceSelect: (monthlyPrice: number) => void;
}

export function HierarchicalProductPicker({
  value,
  onChange,
  onPriceSelect,
}: HierarchicalProductPickerProps) {
  const { data: products, isLoading } = usePriceBook();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Parse the current value
  const parsed = useMemo(() => parseDiscountMatrixName(value), [value]);
  
  // Get display name for the current value
  const displayValue = useMemo(() => {
    if (!value) return '';
    if (parsed.edition) {
      return `${parsed.category} - ${parsed.edition}`;
    }
    return parsed.category;
  }, [value, parsed]);
  
  // Search results
  const searchResults = useMemo(() => {
    if (!products) return [];
    return searchProducts(products, searchQuery, 30);
  }, [products, searchQuery]);
  
  // Handle product selection
  const handleSelect = useCallback((result: SearchResult) => {
    // Build the discount matrix name for database storage
    const discountMatrixName = getDiscountMatrixName(result.category, result.edition);
    onChange(discountMatrixName);
    onPriceSelect(result.monthlyPrice);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange, onPriceSelect]);
  
  // Handle custom product name
  const handleCustomNameChange = (name: string) => {
    setCustomName(name);
    onChange(name);
  };
  
  // Toggle to custom mode
  const handleSwitchToCustom = () => {
    setIsCustomMode(true);
    setCustomName(value);
    setIsOpen(false);
  };
  
  // Toggle back to picker mode
  const handleSwitchToPicker = () => {
    setIsCustomMode(false);
    setSearchQuery('');
  };
  
  // Clear selection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  }, [onChange]);
  
  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);
  
  if (isLoading) {
    return (
      <div className="h-10 bg-muted animate-pulse rounded-md" />
    );
  }
  
  // Custom product mode
  if (isCustomMode) {
    return (
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={customName}
            onChange={(e) => handleCustomNameChange(e.target.value)}
            placeholder="Enter custom product name..."
            className="h-10"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSwitchToPicker}
          className="h-10 px-3 text-muted-foreground"
        >
          Use picker
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex gap-2 items-end">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "h-10 justify-between flex-1 min-w-0 font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {displayValue || "Search products..."}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {value && (
                <X 
                  className="h-4 w-4 opacity-50 hover:opacity-100" 
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          sideOffset={4}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search products..."
              className="h-11 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          {/* Results */}
          <ScrollArea className="h-[300px]">
            {searchResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No products found.
              </div>
            ) : (
              <div className="p-1">
                {searchResults.map((result) => {
                  const isSelected = value === getDiscountMatrixName(result.category, result.edition);
                  return (
                    <button
                      key={`${result.category}-${result.edition ?? 'null'}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-md",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="font-medium truncate w-full text-left">
                          {result.category}
                        </span>
                        {result.edition && (
                          <span className="text-xs text-muted-foreground">
                            {result.edition} Edition
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ${result.monthlyPrice.toLocaleString()}/mo
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          {/* Custom product option */}
          <div className="border-t p-2">
            <button
              onClick={handleSwitchToCustom}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
            >
              <Pencil className="h-4 w-4" />
              Enter custom product name
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

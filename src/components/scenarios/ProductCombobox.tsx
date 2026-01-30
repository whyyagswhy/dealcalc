import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePriceBookProducts } from '@/hooks/usePriceBookProducts';
import { groupProductsByCategory, formatPrice, type PriceBookProduct } from '@/lib/priceBookTypes';

interface ProductComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onPriceSelect?: (monthlyPrice: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ProductCombobox({
  value,
  onChange,
  onPriceSelect,
  placeholder = 'Select product...',
  disabled = false,
  className,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { data: products, isLoading, error } = usePriceBookProducts();

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product =>
      product.product_name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      (product.edition && product.edition.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  // Group filtered products by category
  const groupedProducts = useMemo(() => 
    groupProductsByCategory(filteredProducts),
    [filteredProducts]
  );

  // Check if current search query has an exact match
  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim() || !products) return true;
    return products.some(p => 
      p.product_name.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [products, searchQuery]);

  // Handle product selection
  const handleSelect = useCallback((product: PriceBookProduct) => {
    onChange(product.product_name);
    if (onPriceSelect) {
      onPriceSelect(product.monthly_list_price);
    }
    setOpen(false);
    setSearchQuery('');
  }, [onChange, onPriceSelect]);

  // Handle custom product entry
  const handleCustomSelect = useCallback(() => {
    onChange(searchQuery.trim());
    setOpen(false);
    setSearchQuery('');
  }, [onChange, searchQuery]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Find if current value matches a product
  const selectedProduct = useMemo(() => 
    products?.find(p => p.product_name === value),
    [products, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search products..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {error && (
              <div className="py-6 text-center text-sm text-destructive">
                Failed to load products
              </div>
            )}

            {!isLoading && !error && filteredProducts.length === 0 && !searchQuery.trim() && (
              <CommandEmpty>No products available</CommandEmpty>
            )}

            {!isLoading && !error && filteredProducts.length === 0 && searchQuery.trim() && (
              <CommandEmpty>No products found</CommandEmpty>
            )}

            {/* Custom product option when no exact match */}
            {!isLoading && searchQuery.trim() && !hasExactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`custom-${searchQuery}`}
                  onSelect={handleCustomSelect}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Use custom product: </span>
                  <span className="ml-1 font-medium">"{searchQuery.trim()}"</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Grouped product list */}
            {groupedProducts.map((group) => (
              <CommandGroup key={group.category} heading={group.category}>
                {group.products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.product_name}
                    onSelect={() => handleSelect(product)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.product_name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className="truncate">{product.product_name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatPrice(product.annual_list_price, product.pricing_unit)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { usePriceBook, type PriceBookProduct } from '@/hooks/usePriceBook';
import { 
  groupProductsByCategory, 
  parseDiscountMatrixName, 
  buildDiscountMatrixName,
  getPriceForSelection,
  type CategoryGroup 
} from '@/lib/productMapping';

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
  
  // Parse the current value to extract category and edition
  const parsed = useMemo(() => parseDiscountMatrixName(value), [value]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>(parsed.category || '');
  const [selectedEdition, setSelectedEdition] = useState<string | null>(parsed.edition);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  
  // Group products by category
  const categoryGroups = useMemo(() => {
    if (!products) return [];
    return groupProductsByCategory(products);
  }, [products]);
  
  // Get editions for the selected category
  const availableEditions = useMemo(() => {
    if (!selectedCategory) return [];
    const group = categoryGroups.find(g => g.category === selectedCategory);
    return group?.editions ?? [];
  }, [categoryGroups, selectedCategory]);
  
  // Determine if the current value matches a known product
  const isKnownProduct = useMemo(() => {
    if (!products || !value) return false;
    const { category, edition } = parseDiscountMatrixName(value);
    return products.some(p => 
      p.category === category && 
      (edition === null ? p.edition === null : p.edition === edition)
    );
  }, [products, value]);
  
  // Sync local state when value prop changes
  useEffect(() => {
    const { category, edition } = parseDiscountMatrixName(value);
    
    if (isKnownProduct) {
      setSelectedCategory(category);
      setSelectedEdition(edition);
      setIsCustomMode(false);
    } else if (value && !isKnownProduct) {
      // Value exists but doesn't match price book - it's a custom product
      setCustomName(value);
      setIsCustomMode(true);
    }
  }, [value, isKnownProduct]);
  
  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedEdition(null); // Reset edition when category changes
    
    // Find the group to check if it has editions
    const group = categoryGroups.find(g => g.category === category);
    
    if (group) {
      // If only one edition (or null edition only), auto-select it
      if (group.editions.length === 1) {
        const edition = group.editions[0].edition;
        setSelectedEdition(edition);
        
        // Build product name and trigger callbacks
        const productName = buildDiscountMatrixName(category, edition);
        onChange(productName);
        
        // Get price and trigger callback
        if (products) {
          const price = getPriceForSelection(products, category, edition);
          if (price !== null) {
            onPriceSelect(price);
          }
        }
      }
    }
  };
  
  // Handle edition selection
  const handleEditionChange = (edition: string) => {
    // Handle "none" as null
    const editionValue = edition === '__none__' ? null : edition;
    setSelectedEdition(editionValue);
    
    // Build product name and trigger callbacks
    const productName = buildDiscountMatrixName(selectedCategory, editionValue);
    onChange(productName);
    
    // Get price and trigger callback
    if (products) {
      const price = getPriceForSelection(products, selectedCategory, editionValue);
      if (price !== null) {
        onPriceSelect(price);
      }
    }
  };
  
  // Handle custom product name
  const handleCustomNameChange = (name: string) => {
    setCustomName(name);
    onChange(name);
  };
  
  // Toggle to custom mode
  const handleSwitchToCustom = () => {
    setIsCustomMode(true);
    setCustomName(value);
  };
  
  // Toggle back to picker mode
  const handleSwitchToPicker = () => {
    setIsCustomMode(false);
    setSelectedCategory('');
    setSelectedEdition(null);
  };
  
  if (isLoading) {
    return (
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
        <div className="h-10 flex-1 bg-muted animate-pulse rounded-md" />
      </div>
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
      {/* Category Select */}
      <div className="flex-1 min-w-0">
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select product..." />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {categoryGroups.map((group) => (
              <SelectItem key={group.category} value={group.category}>
                {group.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Edition Select - only show if category has multiple editions */}
      {selectedCategory && availableEditions.length > 1 && (
        <div className="flex-1 min-w-0">
          <Select 
            value={selectedEdition ?? '__none__'} 
            onValueChange={handleEditionChange}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select edition..." />
            </SelectTrigger>
            <SelectContent>
              {availableEditions.map((ed) => (
                <SelectItem 
                  key={ed.edition ?? '__none__'} 
                  value={ed.edition ?? '__none__'}
                >
                  {ed.edition ?? 'Standard'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Custom product button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSwitchToCustom}
        className="h-10 w-10 shrink-0 text-muted-foreground"
        title="Enter custom product name"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

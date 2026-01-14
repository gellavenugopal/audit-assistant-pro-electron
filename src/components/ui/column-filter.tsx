import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnFilterProps {
  column: string;
  values: (string | number)[];
  selectedValues: Set<string | number>;
  onFilterChange: (values: Set<string | number>) => void;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (direction: 'asc' | 'desc' | null) => void;
  isNumeric?: boolean;
}

export function ColumnFilter({
  column,
  values,
  selectedValues,
  onFilterChange,
  sortDirection,
  onSort,
  isNumeric = false,
}: ColumnFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Excel-style number filter state
  const [numberFilterType, setNumberFilterType] = useState<string>('');
  const [numberFilterValue, setNumberFilterValue] = useState<string>('');
  const [numberFilterValue2, setNumberFilterValue2] = useState<string>('');

  const uniqueValues = useMemo(() => {
    const unique = Array.from(new Set(values.filter(v => v !== null && v !== undefined && v !== '')));
    if (isNumeric) {
      return unique.sort((a, b) => Number(a) - Number(b));
    }
    return unique.sort((a, b) => String(a).localeCompare(String(b)));
  }, [values, isNumeric]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const search = searchTerm.toLowerCase();
    return uniqueValues.filter(v => String(v).toLowerCase().includes(search));
  }, [uniqueValues, searchTerm]);

  const hasFilter = selectedValues.size > 0 && selectedValues.size < uniqueValues.length;
  const allSelected = selectedValues.size === 0 || selectedValues.size === uniqueValues.length;

  const handleSelectAll = () => {
    if (allSelected) {
      // Untick: deselect all (show none)
      onFilterChange(new Set(uniqueValues));
    } else {
      // Tick: select all (show all)
      onFilterChange(new Set());
    }
  };

  const handleToggleValue = (value: string | number) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    // If all values are selected, clear the filter (show all)
    if (newSelected.size === uniqueValues.length) {
      onFilterChange(new Set());
    } else {
      onFilterChange(newSelected);
    }
  };

  const handleClearFilter = () => {
    onFilterChange(new Set());
    setSearchTerm('');
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    if (onSort) {
      onSort(sortDirection === direction ? null : direction);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-1 -ml-1 hover:bg-gray-200",
            hasFilter && "text-blue-600"
          )}
        >
          <span className="sr-only">Filter {column}</span>
          {sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : sortDirection === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : hasFilter ? (
            <Filter className="h-3 w-3 fill-current" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {/* Sort Options */}
        {onSort && (
          <div className="border-b p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-xs",
                sortDirection === 'asc' && "bg-blue-50 text-blue-700"
              )}
              onClick={() => handleSort('asc')}
            >
              <ArrowUp className="h-3 w-3 mr-2" />
              Sort A to Z {isNumeric && '(Smallest to Largest)'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-xs",
                sortDirection === 'desc' && "bg-blue-50 text-blue-700"
              )}
              onClick={() => handleSort('desc')}
            >
              <ArrowDown className="h-3 w-3 mr-2" />
              Sort Z to A {isNumeric && '(Largest to Smallest)'}
            </Button>
          </div>
        )}

        {/* Excel-style Number Filters for numeric columns */}
        {isNumeric && (
          <div className="p-2 border-b">
            <label className="block text-xs font-semibold mb-1">Number Filters</label>
            <select
              className="w-full text-xs border rounded p-1 mb-1"
              value={numberFilterType}
              onChange={e => setNumberFilterType(e.target.value)}
            >
              <option value="">None</option>
              <option value="equals">Equals...</option>
              <option value="notEquals">Does Not Equal...</option>
              <option value="greater">Greater Than...</option>
              <option value="greaterOrEqual">Greater Than Or Equal To...</option>
              <option value="less">Less Than...</option>
              <option value="lessOrEqual">Less Than Or Equal To...</option>
              <option value="between">Between...</option>
              <option value="top10">Top 10...</option>
              <option value="aboveAvg">Above Average</option>
              <option value="belowAvg">Below Average</option>
              <option value="custom">Custom Filter...</option>
            </select>
            {/* Filter value input(s) */}
            {numberFilterType && numberFilterType !== 'aboveAvg' && numberFilterType !== 'belowAvg' && numberFilterType !== 'top10' && numberFilterType !== 'custom' && (
              <div className="flex gap-2 mb-1">
                <Input
                  type="number"
                  className="h-7 text-xs"
                  placeholder="Value"
                  value={numberFilterValue}
                  onChange={e => setNumberFilterValue(e.target.value)}
                />
                {numberFilterType === 'between' && (
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    placeholder="And"
                    value={numberFilterValue2}
                    onChange={e => setNumberFilterValue2(e.target.value)}
                  />
                )}
              </div>
            )}
            {/* Note: Actual filtering logic to be implemented in table filter handler */}
          </div>
        )}
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>

        {/* Clear Filter */}
        {hasFilter && (
          <div className="p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleClearFilter}
            >
              <X className="h-3 w-3 mr-2" />
              Clear Filter
            </Button>
          </div>
        )}

        {/* Select All */}
        <div className="p-2 border-b">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium">(Select All)</span>
          </label>
        </div>

        {/* Values List */}
        <ScrollArea className="h-48">
          <div className="p-2 space-y-1">
            {filteredValues.map((value, index) => (
              <label
                key={index}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <Checkbox
                  checked={selectedValues.size === 0 || selectedValues.has(value)}
                  onCheckedChange={() => handleToggleValue(value)}
                />
                <span className="truncate">
                  {isNumeric ? Number(value).toLocaleString('en-IN') : String(value) || '(Blank)'}
                </span>
              </label>
            ))}
            {filteredValues.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-2">
                No values found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

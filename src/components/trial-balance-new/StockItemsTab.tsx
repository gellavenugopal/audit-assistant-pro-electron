import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ColumnFilter } from '@/components/ui/column-filter';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { classifyStockItem } from '@/utils/fuzzyMatch';
import { useToast } from '@/hooks/use-toast';

interface StockItem {
  'Item Name': string;
  'Stock Group': string;
  'Primary Group': string;
  'Opening Value': number;
  'Closing Value': number;
  'Stock Category': string;
  'Composite Key': string;
}

const STOCK_CATEGORIES = [
  "Raw Material",
  "Packaging Material",
  "Work-in-Progress",
  "Finished Goods",
  "Semi-Finished Goods",
  "Stock-in-Trade",
  "Consumables",
  "Spare Parts",
  "Other"
];

interface StockItemsTabProps {
  stockData: StockItem[];
  onUpdateStockData: (data: StockItem[]) => void;
  businessType?: string;
  searchTerm?: string;
  onSelectionChange?: (count: number) => void;
  bulkUpdateRequestId?: number;
  deleteSelectedRequestId?: number;
  numberScale?: 'actual' | 'tens' | 'hundreds' | 'thousands' | 'lakhs' | 'millions' | 'crores';
  tableSettings?: {
    rowHeight: number;
    widths: Record<string, number>;
    fonts: Record<string, number>;
  };
}

export function StockItemsTab({
  stockData,
  onUpdateStockData,
  businessType = '',
  searchTerm = '',
  onSelectionChange,
  bulkUpdateRequestId,
  deleteSelectedRequestId,
  numberScale = 'actual',
  tableSettings,
}: StockItemsTabProps) {
  const { toast } = useToast();
  const rowHeight = tableSettings?.rowHeight ?? 28;
  const getWidth = useCallback((column: string, fallback: number) => {
    const value = tableSettings?.widths?.[column];
    return typeof value === 'number' ? value : fallback;
  }, [tableSettings]);
  const getFont = useCallback((column: string, fallback: number) => {
    const value = tableSettings?.fonts?.[column];
    return typeof value === 'number' ? value : fallback;
  }, [tableSettings]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  
  // Ref to track if auto-classification has already run for this businessType
  const lastAutoClassifiedRef = useRef<{ businessType: string; count: number } | null>(null);
  
  // Column filters and sorting state
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string | number>>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Selection state for bulk operations
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  
  // Single item edit dialog
  const [isSingleEditDialogOpen, setIsSingleEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [singleEditCategory, setSingleEditCategory] = useState<string>('');
  
  // Keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  
  // Helper to get unique column values for filters
  const getColumnValues = useCallback((column: string) => {
    if (!stockData || !Array.isArray(stockData)) return [];
    return stockData
      .filter(item => item !== null && item !== undefined)
      .map(item => item[column as keyof StockItem])
      .filter(v => v !== null && v !== undefined) as (string | number)[];
  }, [stockData]);
  
  // Handlers for column filter changes
  const handleFilterChange = useCallback((column: string, values: Set<string | number>) => {
    setColumnFilters(prev => ({ ...prev, [column]: values }));
  }, []);
  
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc' | null) => {
    setSortColumn(direction ? column : null);
    setSortDirection(direction);
  }, []);
  
  // Base data - filter out items with both opening AND closing = 0
  const baseStockData = useMemo(() => {
    if (!stockData || !Array.isArray(stockData)) return [];
    return stockData.filter(item => {
      if (!item) return false;
      // Use Math.abs since stock values are assets (Dr)
      const opening = Math.abs(item['Opening Value'] || 0);
      const closing = Math.abs(item['Closing Value'] || 0);
      // Keep item if it has any non-zero value
      return !(opening === 0 && closing === 0);
    });
  }, [stockData]);
  
  // Filtered data based on all filters (including parent searchTerm)
  const filteredData = useMemo(() => {
    let filtered = baseStockData.filter(item => {
      if (!item) return false;
      // Check parent search term - with null safety
      const itemName = item['Item Name'] || '';
      const stockGroup = item['Stock Group'] || '';
      const primaryGroup = item['Primary Group'] || '';
      
      const matchesSearch = !searchTerm || 
        itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stockGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        primaryGroup.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
    
    // Apply column filters
    Object.entries(columnFilters).forEach(([column, selectedValues]) => {
      if (selectedValues.size > 0) {
        filtered = filtered.filter(item => {
          const value = item[column as keyof StockItem];
          return selectedValues.has(value as string | number);
        });
      }
    });
    
    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn as keyof StockItem];
        const bVal = b[sortColumn as keyof StockItem];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        return sortDirection === 'asc' 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      });
    }
    
    return filtered;
  }, [baseStockData, searchTerm, columnFilters, sortColumn, sortDirection]);
  
  // Auto-classify stock items when businessType changes or new items are added
  useEffect(() => {
    if (!businessType || !stockData || stockData.length === 0) return;
    
    // Guard: Skip if we already ran for this businessType and the exact item keys
    const fingerprint = stockData.map(item => item?.['Composite Key']).join('|');
    const lastRun = lastAutoClassifiedRef.current;
    if (lastRun && lastRun.businessType === businessType && lastRun.count === stockData.length && lastRun.fingerprint === fingerprint) {
      return;
    }
    
    let updated = false;
    const newData = stockData.map(item => {
      if (!item) return item;
      // Only auto-classify if not already classified
      if (!item['Stock Category'] || item['Stock Category'] === 'Unclassified') {
        const category = classifyStockItem(
          item['Item Name'] || '',
          item['Stock Group'] || '',
          businessType
        );
        if (category && category !== 'Unclassified') {
          updated = true;
          return { ...item, 'Stock Category': category };
        }
      }
      return item;
    });
    
    // Update the ref to prevent re-running for identical state
    lastAutoClassifiedRef.current = { businessType, count: stockData.length, fingerprint };
    
    if (updated) {
      onUpdateStockData(newData);
      toast({
        title: 'Auto-Classification Complete',
        description: `Stock items classified based on ${businessType} business rules`,
      });
    }
  }, [businessType, stockData, onUpdateStockData, toast]);

  const formatNumber = (num: number): string => {
    const scaleFactor = numberScale === 'tens'
      ? 10
      : numberScale === 'hundreds'
        ? 100
        : numberScale === 'thousands'
          ? 1000
          : numberScale === 'lakhs'
            ? 100000
            : numberScale === 'millions'
              ? 1000000
              : numberScale === 'crores'
                ? 10000000
                : 1;
    const scaled = num / scaleFactor;
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(scaled);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditCategory(stockData[index]['Stock Category'] || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const newData = [...stockData];
    newData[editingIndex] = {
      ...newData[editingIndex],
      'Stock Category': editCategory
    };
    onUpdateStockData(newData);
    setEditingIndex(null);
    setEditCategory('');
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    if (!confirm(`Delete ${selectedIndices.size} selected stock item(s)?`)) return;
    const newData = stockData.filter((_, i) => !selectedIndices.has(i));
    onUpdateStockData(newData);
    setSelectedIndices(new Set());
  }, [selectedIndices, stockData, onUpdateStockData]);
  
  const handleAutoClassifyAll = () => {
    if (!businessType) {
      toast({
        title: 'Business Type Required',
        description: 'Please select a business type first',
        variant: 'destructive'
      });
      return;
    }
    
    const newData = stockData.map(item => {
      if (!item) return item;
      return {
        ...item,
        'Stock Category': classifyStockItem(
          item['Item Name'] || '',
          item['Stock Group'] || '',
          businessType
        )
      };
    }).filter(Boolean);
    
    onUpdateStockData(newData);
    
    const classified = newData.filter(item => item['Stock Category'] !== 'Unclassified').length;
    toast({
      title: 'Auto-Classification Complete',
      description: `${classified} of ${stockData.length} items classified`,
    });
  };
  
  // Selection handlers with Shift+click range support
  const toggleSelection = useCallback((originalIndex: number, event?: React.MouseEvent) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      
      // Shift+click for range selection
      if (event?.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, originalIndex);
        const end = Math.max(lastSelectedIndex, originalIndex);
        for (let i = start; i <= end; i++) {
          next.add(i);
        }
      } else {
        // Regular click to toggle
        if (next.has(originalIndex)) {
          next.delete(originalIndex);
        } else {
          next.add(originalIndex);
        }
      }
      
      return next;
    });
    setLastSelectedIndex(originalIndex);
  }, [lastSelectedIndex]);
  
  const selectAll = useCallback(() => {
    const allIndices = new Set(filteredData.map(item => {
      if (!item) return -1;
      return stockData.findIndex(s => s && s['Composite Key'] === item['Composite Key']);
    }).filter(i => i >= 0));
    setSelectedIndices(allIndices);
  }, [filteredData, stockData]);
  
  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);
  
  // Double-click to open edit dialog
  const handleDoubleClick = useCallback((item: StockItem, originalIndex: number) => {
    setEditingItem(item);
    setEditingItemIndex(originalIndex);
    setSingleEditCategory(item['Stock Category'] || '');
    setIsSingleEditDialogOpen(true);
  }, []);
  
  // Save single item edit
  const handleSaveSingleEdit = useCallback(() => {
    if (editingItemIndex === -1) return;
    
    const newData = [...stockData];
    newData[editingItemIndex] = {
      ...newData[editingItemIndex],
      'Stock Category': singleEditCategory
    };
    onUpdateStockData(newData);
    setIsSingleEditDialogOpen(false);
    setEditingItem(null);
    setEditingItemIndex(-1);
    toast({
      title: 'Stock Item Updated',
      description: 'Category has been updated successfully',
    });
  }, [editingItemIndex, singleEditCategory, stockData, onUpdateStockData, toast]);
  
  // Bulk update handler
  const handleBulkUpdate = useCallback(() => {
    if (selectedIndices.size === 0 || !bulkCategory) return;
    
    const newData = stockData.map((item, index) => {
      if (selectedIndices.has(index)) {
        return { ...item, 'Stock Category': bulkCategory };
      }
      return item;
    });
    
    onUpdateStockData(newData);
    setIsBulkUpdateDialogOpen(false);
    setBulkCategory('');
    setSelectedIndices(new Set());
    
    toast({
      title: 'Bulk Update Complete',
      description: `Updated ${selectedIndices.size} items`,
    });
  }, [selectedIndices, bulkCategory, stockData, onUpdateStockData, toast]);

  useEffect(() => {
    onSelectionChange?.(selectedIndices.size);
  }, [selectedIndices, onSelectionChange]);

  useEffect(() => {
    if (!bulkUpdateRequestId) return;
    if (selectedIndices.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Select stock items to update',
        variant: 'destructive',
      });
      return;
    }
    setIsBulkUpdateDialogOpen(true);
  }, [bulkUpdateRequestId, selectedIndices, toast]);

  useEffect(() => {
    if (!deleteSelectedRequestId) return;
    handleDeleteSelected();
  }, [deleteSelectedRequestId, handleDeleteSelected]);
  
  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredData.length === 0) return;
    
    const maxIndex = filteredData.length - 1;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRowIndex(prev => Math.min(prev + 1, maxIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRowIndex(prev => Math.max(prev - 1, 0));
        break;
      case ' ': // Spacebar to toggle selection
        e.preventDefault();
        if (focusedRowIndex >= 0) {
          const item = filteredData[focusedRowIndex];
          if (item) {
            const originalIndex = stockData.findIndex(s => s && s['Composite Key'] === item['Composite Key']);
            if (originalIndex >= 0) toggleSelection(originalIndex);
          }
        }
        break;
      case 'Enter': // Enter to edit
        e.preventDefault();
        if (focusedRowIndex >= 0) {
          const item = filteredData[focusedRowIndex];
          if (item) {
            const originalIndex = stockData.findIndex(s => s && s['Composite Key'] === item['Composite Key']);
            if (originalIndex >= 0) handleDoubleClick(item, originalIndex);
          }
        }
        break;
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          selectAll();
        }
        break;
      case 'Escape':
        clearSelection();
        setFocusedRowIndex(-1);
        break;
    }
  }, [filteredData, focusedRowIndex, stockData, toggleSelection, handleDoubleClick, selectAll, clearSelection]);

  return (
    <div className="space-y-0" onKeyDown={handleKeyDown} tabIndex={0}>
      <style>{`
        .stock-items-table thead th {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
        }
        .stock-items-table tbody td {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          font-size: 11px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .stock-items-table tbody tr {
          height: ${rowHeight}px !important;
        }
      `}</style>
      {baseStockData.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No stock items loaded. Stock items will be imported from Tally if available.
        </div>
      ) : filteredData.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No items match the current filters.
        </div>
      ) : (
        <div className="border rounded-lg w-full overflow-auto">
          <Table className="stock-items-table table-fixed w-full">
            <TableHeader className="sticky top-0 bg-white">
              <TableRow style={{ height: `${rowHeight}px` }}>
                <TableHead className="w-10 py-1 font-semibold" style={{ fontSize: `${getFont('Select', 10)}px` }}>
                  <Checkbox
                    checked={selectedIndices.size === filteredData.length && filteredData.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) selectAll();
                      else clearSelection();
                    }}
                  />
                </TableHead>
                <TableHead style={{ width: getWidth('Item Name', 180) }}>
                  <div className="flex items-center gap-1" style={{ fontSize: `${getFont('Item Name', 10)}px` }}>
                    Item Name
                    <ColumnFilter
                      column="Item Name"
                      values={getColumnValues('Item Name')}
                      selectedValues={columnFilters['Item Name'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Item Name', values)}
                      sortDirection={sortColumn === 'Item Name' ? sortDirection : null}
                      onSort={(dir) => handleSort('Item Name', dir)}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: getWidth('Stock Group', 120) }}>
                  <div className="flex items-center gap-1" style={{ fontSize: `${getFont('Stock Group', 10)}px` }}>
                    Stock Group
                    <ColumnFilter
                      column="Stock Group"
                      values={getColumnValues('Stock Group')}
                      selectedValues={columnFilters['Stock Group'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Stock Group', values)}
                      sortDirection={sortColumn === 'Stock Group' ? sortDirection : null}
                      onSort={(dir) => handleSort('Stock Group', dir)}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: getWidth('Primary Group', 120) }}>
                  <div className="flex items-center gap-1" style={{ fontSize: `${getFont('Primary Group', 10)}px` }}>
                    Primary Group
                    <ColumnFilter
                      column="Primary Group"
                      values={getColumnValues('Primary Group')}
                      selectedValues={columnFilters['Primary Group'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Primary Group', values)}
                      sortDirection={sortColumn === 'Primary Group' ? sortDirection : null}
                      onSort={(dir) => handleSort('Primary Group', dir)}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right" style={{ width: getWidth('Opening Value', 100) }}>
                  <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getFont('Opening Value', 10)}px` }}>
                    Opening Value
                    <ColumnFilter
                      column="Opening Value"
                      values={getColumnValues('Opening Value')}
                      selectedValues={columnFilters['Opening Value'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Opening Value', values)}
                      sortDirection={sortColumn === 'Opening Value' ? sortDirection : null}
                      onSort={(dir) => handleSort('Opening Value', dir)}
                      isNumeric
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right" style={{ width: getWidth('Closing Value', 100) }}>
                  <div className="flex items-center justify-end gap-1" style={{ fontSize: `${getFont('Closing Value', 10)}px` }}>
                    Closing Value
                    <ColumnFilter
                      column="Closing Value"
                      values={getColumnValues('Closing Value')}
                      selectedValues={columnFilters['Closing Value'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Closing Value', values)}
                      sortDirection={sortColumn === 'Closing Value' ? sortDirection : null}
                      onSort={(dir) => handleSort('Closing Value', dir)}
                      isNumeric
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: getWidth('Stock Category', 140) }}>
                  <div className="flex items-center gap-1" style={{ fontSize: `${getFont('Stock Category', 10)}px` }}>
                    Stock Category
                    <ColumnFilter
                      column="Stock Category"
                      values={getColumnValues('Stock Category')}
                      selectedValues={columnFilters['Stock Category'] || new Set()}
                      onFilterChange={(values) => handleFilterChange('Stock Category', values)}
                      sortDirection={sortColumn === 'Stock Category' ? sortDirection : null}
                      onSort={(dir) => handleSort('Stock Category', dir)}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: getWidth('Actions', 80) }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, displayIndex) => {
                if (!item) return null;
                // Find original index in stockData for updates
                const originalIndex = stockData.findIndex(s => s && s['Composite Key'] === item['Composite Key']);
                const isEditing = editingIndex === originalIndex;
                const isSelected = selectedIndices.has(originalIndex);
                const isFocused = focusedRowIndex === displayIndex;
                
                return (
                  <TableRow 
                    key={item['Composite Key'] || displayIndex} 
                    className={cn(
                      "hover:bg-gray-50 cursor-pointer",
                      isSelected && "bg-blue-50",
                      isFocused && "ring-2 ring-blue-400 ring-inset"
                    )}
                    style={{ height: `${rowHeight}px` }}
                    onClick={(e) => toggleSelection(originalIndex, e)}
                    onDoubleClick={() => handleDoubleClick(item, originalIndex)}
                  >
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(originalIndex)}
                      />
                    </TableCell>
                    <TableCell className="font-medium" style={{ width: getWidth('Item Name', 180), fontSize: `${getFont('Item Name', 10)}px` }}>{item['Item Name']}</TableCell>
                    <TableCell className="text-gray-600" style={{ width: getWidth('Stock Group', 120), fontSize: `${getFont('Stock Group', 10)}px` }}>{item['Stock Group'] || '-'}</TableCell>
                    <TableCell className="text-gray-600" style={{ width: getWidth('Primary Group', 120), fontSize: `${getFont('Primary Group', 10)}px` }}>{item['Primary Group'] || '-'}</TableCell>
                    <TableCell className="text-right" style={{ width: getWidth('Opening Value', 100), fontSize: `${getFont('Opening Value', 10)}px` }}>{formatNumber(item['Opening Value'])}</TableCell>
                    <TableCell className="text-right font-medium" style={{ width: getWidth('Closing Value', 100), fontSize: `${getFont('Closing Value', 10)}px` }}>{formatNumber(item['Closing Value'])}</TableCell>
                    <TableCell style={{ width: getWidth('Stock Category', 140), fontSize: `${getFont('Stock Category', 10)}px` }}>
                      {isEditing ? (
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STOCK_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={cn(
                          "px-2 py-1 rounded font-medium",
                          item['Stock Category'] ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                        )} style={{ fontSize: `${getFont('Stock Category', 10)}px` }}>
                          {item['Stock Category'] || 'Unclassified'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} style={{ width: getWidth('Actions', 80), fontSize: `${getFont('Actions', 10)}px` }}>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleDoubleClick(item, originalIndex)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Single Item Edit Dialog */}
      <Dialog open={isSingleEditDialogOpen} onOpenChange={setIsSingleEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock Item</DialogTitle>
            <DialogDescription>
              Update the classification for this stock item
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Item Name</Label>
                <div className="font-medium">{editingItem['Item Name']}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Stock Group</Label>
                  <div className="text-sm">{editingItem['Stock Group'] || '-'}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Primary Group</Label>
                  <div className="text-sm">{editingItem['Primary Group'] || '-'}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Opening Value</Label>
                  <div className="text-sm">{formatNumber(editingItem['Opening Value'])}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Closing Value</Label>
                  <div className="text-sm">{formatNumber(editingItem['Closing Value'])}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Stock Category</Label>
                <Select value={singleEditCategory} onValueChange={setSingleEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSingleEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSingleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Update Dialog */}
      <Dialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Stock Items</DialogTitle>
            <DialogDescription>
              Update classification for {selectedIndices.size} selected items
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stock Category</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              This will update the category for all {selectedIndices.size} selected items.
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkCategory}>
              Update {selectedIndices.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Pencil, Trash2, Wand2, Filter, X } from 'lucide-react';
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
}

export function StockItemsTab({ stockData, onUpdateStockData, businessType = '' }: StockItemsTabProps) {
  const { toast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [stockGroupFilter, setStockGroupFilter] = useState<string>('all');
  const [primaryGroupFilter, setPrimaryGroupFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Get unique values for filters
  const uniqueStockGroups = useMemo(() => {
    const groups = new Set(stockData.map(item => item['Stock Group']).filter(g => g));
    return Array.from(groups).sort();
  }, [stockData]);
  
  const uniquePrimaryGroups = useMemo(() => {
    const groups = new Set(stockData.map(item => item['Primary Group']).filter(g => g));
    return Array.from(groups).sort();
  }, [stockData]);
  
  const uniqueCategories = useMemo(() => {
    const cats = new Set(stockData.map(item => item['Stock Category']).filter(c => c));
    return Array.from(cats).sort();
  }, [stockData]);
  
  // Filtered data based on all filters
  const filteredData = useMemo(() => {
    return stockData.filter(item => {
      const matchesSearch = !searchFilter || 
        item['Item Name'].toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesStockGroup = stockGroupFilter === 'all' || 
        item['Stock Group'] === stockGroupFilter;
      
      const matchesPrimaryGroup = primaryGroupFilter === 'all' || 
        item['Primary Group'] === primaryGroupFilter;
      
      const matchesCategory = categoryFilter === 'all' || 
        item['Stock Category'] === categoryFilter;
      
      return matchesSearch && matchesStockGroup && matchesPrimaryGroup && matchesCategory;
    });
  }, [stockData, searchFilter, stockGroupFilter, primaryGroupFilter, categoryFilter]);
  
  const hasActiveFilters = searchFilter || stockGroupFilter !== 'all' || 
    primaryGroupFilter !== 'all' || categoryFilter !== 'all';
  
  const clearFilters = () => {
    setSearchFilter('');
    setStockGroupFilter('all');
    setPrimaryGroupFilter('all');
    setCategoryFilter('all');
  };
  
  // Auto-classify stock items when businessType changes or new items are added
  useEffect(() => {
    if (!businessType || stockData.length === 0) return;
    
    let updated = false;
    const newData = stockData.map(item => {
      // Only auto-classify if not already classified
      if (!item['Stock Category'] || item['Stock Category'] === 'Unclassified') {
        const category = classifyStockItem(
          item['Item Name'],
          item['Stock Group'],
          businessType
        );
        if (category && category !== 'Unclassified') {
          updated = true;
          return { ...item, 'Stock Category': category };
        }
      }
      return item;
    });
    
    if (updated) {
      onUpdateStockData(newData);
      toast({
        title: 'Auto-Classification Complete',
        description: `Stock items classified based on ${businessType} business rules`,
      });
    }
  }, [businessType, stockData.length]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
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

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this stock item?')) {
      const newData = stockData.filter((_, i) => i !== index);
      onUpdateStockData(newData);
    }
  };
  
  const handleAutoClassifyAll = () => {
    if (!businessType) {
      toast({
        title: 'Business Type Required',
        description: 'Please select a business type first',
        variant: 'destructive'
      });
      return;
    }
    
    const newData = stockData.map(item => ({
      ...item,
      'Stock Category': classifyStockItem(
        item['Item Name'],
        item['Stock Group'],
        businessType
      )
    }));
    
    onUpdateStockData(newData);
    
    const classified = newData.filter(item => item['Stock Category'] !== 'Unclassified').length;
    toast({
      title: 'Auto-Classification Complete',
      description: `${classified} of ${stockData.length} items classified`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Stock Items
          <span className="text-sm text-gray-500 font-normal">
            ({filteredData.length} of {stockData.length})
          </span>
        </h3>
        <div className="flex gap-2">
          {businessType && stockData.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleAutoClassifyAll}>
              <Wand2 className="w-4 h-4 mr-2" />
              Auto-Classify
            </Button>
          )}
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      {stockData.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg border">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <Input
                placeholder="Search item name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Select value={stockGroupFilter} onValueChange={setStockGroupFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Stock Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Groups</SelectItem>
                  {uniqueStockGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={primaryGroupFilter} onValueChange={setPrimaryGroupFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Primary Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Primary Groups</SelectItem>
                  {uniquePrimaryGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={clearFilters} className="h-9">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {stockData.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No stock items loaded. Stock items will be imported from Tally if available.
        </div>
      ) : filteredData.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No items match the current filters.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-white">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Stock Group</TableHead>
                <TableHead>Primary Group</TableHead>
                <TableHead className="text-right">Opening Value</TableHead>
                <TableHead className="text-right">Closing Value</TableHead>
                <TableHead>Stock Category</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, displayIndex) => {
                // Find original index in stockData for updates
                const originalIndex = stockData.findIndex(s => s['Composite Key'] === item['Composite Key']);
                const isEditing = editingIndex === originalIndex;
                
                return (
                  <TableRow key={item['Composite Key'] || displayIndex} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{item['Item Name']}</TableCell>
                    <TableCell className="text-xs text-gray-600">{item['Stock Group'] || '-'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{item['Primary Group'] || '-'}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(item['Opening Value'])}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatNumber(item['Closing Value'])}</TableCell>
                    <TableCell>
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
                          "px-2 py-1 rounded text-xs font-medium",
                          item['Stock Category'] ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                        )}>
                          {item['Stock Category'] || 'Unclassified'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="outline" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(originalIndex)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(originalIndex)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


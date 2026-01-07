import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Package, Plus, Pencil, Trash2, Wand2 } from 'lucide-react';
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
        <h3 className="text-lg font-semibold">Stock Items</h3>
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

      {stockData.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No stock items loaded. Stock items will be imported from Tally if available.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Stock Group</TableHead>
                <TableHead className="text-right">Opening Value</TableHead>
                <TableHead className="text-right">Closing Value</TableHead>
                <TableHead>Stock Category</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item['Item Name']}</TableCell>
                  <TableCell>{item['Stock Group']}</TableCell>
                  <TableCell className="text-right">{formatNumber(item['Opening Value'])}</TableCell>
                  <TableCell className="text-right">{formatNumber(item['Closing Value'])}</TableCell>
                  <TableCell>
                    {editingIndex === index ? (
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
                        "px-2 py-1 rounded text-xs",
                        item['Stock Category'] ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                      )}>
                        {item['Stock Category'] || 'Unclassified'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {editingIndex === index ? (
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
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(index)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClassificationResult, generateLedgerKey } from '@/services/trialBalanceNewClassification';
import { Trash2, Plus, Search } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedMappings: Record<string, ClassificationResult>;
  onSaveMapping: (compositeKey: string, classification: ClassificationResult) => void;
  onDeleteMapping: (compositeKey: string) => void;
}

// H1 Options
const H1_OPTIONS = ['Balance Sheet', 'P&L Account'];

// H2 Options based on H1
const H2_OPTIONS: Record<string, string[]> = {
  'Balance Sheet': ['Assets', 'Liabilities', 'Equity'],
  'P&L Account': ['Income', 'Expenses'],
};

// H3 Options based on H2
const H3_OPTIONS: Record<string, string[]> = {
  'Assets': [
    'PPE & IA (Net)',
    'Investments',
    'Deferred Tax (Net)',
    'Loans and Advances',
    'Trade Receivables',
    'Cash and Bank Balance',
    'Other Current Assets',
    'Other Non-Current Assets',
  ],
  'Liabilities': [
    'Borrowings',
    'Deferred Tax (Net)',
    'Trade Payables',
    'Provisions',
    'Other Current Liabilities',
    'Other Non-Current Liabilities',
  ],
  'Equity': [
    'Share Capital',
    'Reserves and Surplus',
  ],
  'Income': [
    'Revenue from Operations',
    'Other Income',
  ],
  'Expenses': [
    'Cost of Goods Sold',
    'Employee Benefits Expenses',
    'Finance Costs',
    'Depreciation and Amortization Expense',
    'Other Expenses',
    'Other Profit and Loss Items',
  ],
};

// H4 Options based on H3
const H4_OPTIONS: Record<string, string[]> = {
  'Trade Receivables': [
    'Secured Considered Good',
    'Unsecured Considered Good',
    'Doubtful',
  ],
  'Cash and Bank Balance': [
    'Cash on Hand',
    'Balances with Scheduled Banks in Current Account',
    'Balances with Scheduled Banks in Savings Account',
  ],
  'Borrowings': [
    'Secured Term Loans from Banks',
    'Unsecured Term Loans from Banks',
    'Working Capital Loan from Banks',
  ],
  'Trade Payables': [
    'MSME',
    'Non-MSME',
  ],
  'Share Capital': [
    'Equity Share Capital',
    'Preference Share Capital',
  ],
  'Reserves and Surplus': [
    'Capital Reserve',
    'Securities Premium',
    'General Reserve',
    'Retained Earnings',
  ],
  'Revenue from Operations': [
    'Sale of Products',
    'Sale of Services',
    'Other Operating Revenues (specify nature)',
  ],
  'Other Income': [
    'Interest Income',
    'Dividend Income',
    'Profit on Sale of Investments',
  ],
  'Other Expenses': [
    'Rent',
    'Rates and Taxes',
    'Repairs and Maintenance - Building',
    'Insurance',
    'Telephone and Internet',
    'Legal and Professional Fees',
    'Advertisement and Publicity',
    'Travelling and Conveyance',
    'Miscellaneous Expenses',
  ],
};

export function ClassificationManager({ 
  open, 
  onOpenChange, 
  savedMappings, 
  onSaveMapping, 
  onDeleteMapping 
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [ledgerName, setLedgerName] = useState('');
  const [primaryGroup, setPrimaryGroup] = useState('');
  const [h1, setH1] = useState<string>('');
  const [h2, setH2] = useState<string>('');
  const [h3, setH3] = useState<string>('');
  const [h4, setH4] = useState<string>('');
  const [h5, setH5] = useState<string>('');

  // Convert savedMappings to array for display
  const mappingsArray = useMemo(() => {
    return Object.entries(savedMappings).map(([key, value]) => {
      const [ledger, group] = key.split('|');
      return {
        compositeKey: key,
        ledgerName: ledger,
        primaryGroup: group,
        ...value,
      };
    }).filter(m => 
      !searchTerm || 
      m.ledgerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.primaryGroup.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [savedMappings, searchTerm]);

  const availableH2Options = h1 ? (H2_OPTIONS[h1] || []) : [];
  const availableH3Options = h2 ? (H3_OPTIONS[h2] || []) : [];
  const availableH4Options = h3 ? (H4_OPTIONS[h3] || []) : [];

  const handleAdd = () => {
    if (!ledgerName || !primaryGroup || !h1 || !h2) {
      return;
    }

    const compositeKey = generateLedgerKey(ledgerName, primaryGroup);
    const classification: ClassificationResult = {
      h1,
      h2,
      h3: h3 || '',
      h4: h4 || '',
      h5: h5 || '',
    };

    onSaveMapping(compositeKey, classification);
    resetForm();
    setIsAdding(false);
  };

  const resetForm = () => {
    setLedgerName('');
    setPrimaryGroup('');
    setH1('');
    setH2('');
    setH3('');
    setH4('');
    setH5('');
  };

  const handleCancelAdd = () => {
    resetForm();
    setIsAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Classification Manager</DialogTitle>
          <DialogDescription>
            Manage saved classification mappings that override default rules.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Add Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ledger name or primary group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
          </div>

          {/* Add Form */}
          {isAdding && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ledger Name</Label>
                  <Input
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    placeholder="e.g., Bank of India"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Group</Label>
                  <Input
                    value={primaryGroup}
                    onChange={(e) => setPrimaryGroup(e.target.value)}
                    placeholder="e.g., Bank Accounts"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>H1 (Statement)</Label>
                  <Select value={h1} onValueChange={setH1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select H1" />
                    </SelectTrigger>
                    <SelectContent>
                      {H1_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>H2 (Category)</Label>
                  <Select 
                    value={h2} 
                    onValueChange={setH2}
                    disabled={!h1}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!h1 ? "Select H1 first" : "Select H2"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableH2Options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>H3 (Sub-Category)</Label>
                  <Select 
                    value={h3} 
                    onValueChange={setH3}
                    disabled={!h2}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!h2 ? "Select H2 first" : "Select H3"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableH3Options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>H4 (Line Item)</Label>
                  <Select 
                    value={h4} 
                    onValueChange={setH4}
                    disabled={!h3}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!h3 ? "Select H3 first" : availableH4Options.length > 0 ? "Select H4" : "No H4 options"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableH4Options.length > 0 ? (
                        availableH4Options.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No options available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>H5 (Detail)</Label>
                <Input
                  value={h5}
                  onChange={(e) => setH5(e.target.value)}
                  placeholder="Enter detail if required"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelAdd}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={!ledgerName || !primaryGroup || !h1 || !h2}
                >
                  Save Mapping
                </Button>
              </div>
            </div>
          )}

          {/* Mappings Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ledger Name</TableHead>
                  <TableHead>Primary Group</TableHead>
                  <TableHead>H1</TableHead>
                  <TableHead>H2</TableHead>
                  <TableHead>H3</TableHead>
                  <TableHead>H4</TableHead>
                  <TableHead>H5</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappingsArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No mappings found matching your search.' : 'No saved mappings. Click "Add Mapping" to create one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  mappingsArray.map((mapping) => (
                    <TableRow key={mapping.compositeKey}>
                      <TableCell className="font-medium">{mapping.ledgerName}</TableCell>
                      <TableCell>{mapping.primaryGroup}</TableCell>
                      <TableCell>{mapping.h1 || '-'}</TableCell>
                      <TableCell>{mapping.h2 || '-'}</TableCell>
                      <TableCell>{mapping.h3 || '-'}</TableCell>
                      <TableCell>{mapping.h4 || '-'}</TableCell>
                      <TableCell>{mapping.h5 || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteMapping(mapping.compositeKey)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


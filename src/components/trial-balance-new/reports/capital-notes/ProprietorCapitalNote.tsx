import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, RefreshCw } from 'lucide-react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';

// Define the standard line items for Owner's Capital Account
const OWNER_CAPITAL_ITEMS = {
  credits: [
    { key: 'opening_balance', label: 'Opening Balance', autoMap: ['Opening Balance', 'Capital Account'] },
    { key: 'introduced', label: 'Introduced', autoMap: ['Capital Introduced', 'Drawings', 'Investment'] },
    { key: 'income_business', label: 'Income from Business', autoMap: [] },
    { key: 'income_salary', label: 'Income from Salary', autoMap: ['Salary'] },
    { key: 'lic_maturity', label: 'LIC Maturity Proceeds', autoMap: ['LIC', 'Insurance Maturity'] },
    { key: 'gift_received', label: 'Gift from Relatives', autoMap: ['Gift Received'] },
    { key: 'subsidy_grants', label: 'Subsidy/Grants', autoMap: ['Subsidy', 'Grant'] },
    { key: 'sd_interest', label: 'SD Interest', autoMap: ['SD Interest'] },
    { key: 'capital_gain', label: 'Capital Gain', autoMap: ['Capital Gain'] },
    { key: 'ppf_interest', label: 'Interest on PPF', autoMap: ['PPF Interest'] },
    { key: 'lottery_income', label: 'Lottery Income', autoMap: ['Lottery'] },
    { key: 'other_income', label: 'Income from Other Sources', autoMap: ['Other Income'] },
    { key: 'tds_interest', label: 'Interest on TDS', autoMap: ['TDS Interest'] },
    { key: 'savings_interest', label: 'Savings Interest', autoMap: ['Savings Interest', 'Bank Interest'] },
    { key: 'nsc_interest', label: 'Income on NSC', autoMap: ['NSC'] },
    { key: 'kvp_interest', label: 'Interest on KVP', autoMap: ['KVP'] },
    { key: 'sgb_interest', label: 'Interest on Sovereign Gold Bond', autoMap: ['Sovereign Gold', 'SGB'] },
    { key: 'ssy_interest', label: 'Interest on Sukanya Samriddhi Yojana', autoMap: ['Sukanya'] },
    { key: 'dividend_income', label: 'Dividend Income', autoMap: ['Dividend'] },
    { key: 'fno_profit', label: 'F&O Profit', autoMap: ['F&O Profit', 'Futures'] },
    { key: 'speculative_income', label: 'Speculative Income', autoMap: ['Speculative'] },
    { key: 'partner_interest', label: 'Interest on Partners Capital', autoMap: [] },
    { key: 'partner_remuneration', label: "Partner's Remuneration", autoMap: ['Remuneration'] },
    { key: 'partnership_profit', label: 'Profit from Partnership', autoMap: ['Partnership Profit'] },
    { key: 'rental_income', label: 'Rental Income', autoMap: ['Rent Received', 'Rental'] },
    { key: 'commission', label: 'Commission & Brokerage', autoMap: ['Commission', 'Brokerage'] },
    { key: 'deposit_interest', label: 'Interest on Deposits', autoMap: ['FD Interest', 'Deposit Interest'] },
  ],
  debits: [
    { key: 'drawings', label: 'Drawings', autoMap: ['Drawings', 'Withdrawal'] },
    { key: 'income_tax_paid', label: 'Income Tax Paid', autoMap: ['Income Tax Paid', 'IT Paid'] },
    { key: 'provision_it', label: 'Provision for Income Tax', autoMap: ['Provision for Tax', 'Tax Provision'] },
    { key: 'gift_given', label: 'Gift to Relatives', autoMap: ['Gift Given'] },
    { key: 'lic_premium', label: 'Life Insurance Premium', autoMap: ['LIC Premium', 'Insurance Premium'] },
    { key: 'mediclaim', label: 'Mediclaim', autoMap: ['Mediclaim', 'Health Insurance'] },
    { key: 'capital_loss', label: 'Capital Loss', autoMap: ['Capital Loss'] },
    { key: 'fno_loss', label: 'F&O Loss', autoMap: ['F&O Loss'] },
    { key: 'speculative_loss', label: 'Speculative Loss', autoMap: ['Speculative Loss'] },
    { key: 'partnership_loss', label: 'Loss from Partnership', autoMap: ['Partnership Loss'] },
    { key: 'home_loan_interest', label: 'Interest on Home Loan', autoMap: ['Home Loan Interest'] },
    { key: 'car_loan_interest', label: 'Interest on Car Loan and Exp', autoMap: ['Car Loan'] },
    { key: 'children_education', label: 'Children Education', autoMap: ['Children Education', 'School Fees'] },
  ],
};

interface ProprietorCapitalNoteProps {
  lines: TrialBalanceLine[];
  currentYear: string;
  previousYear?: string;
}

type CapitalValues = Record<string, { current: number; previous: number }>;

export function ProprietorCapitalNote({ lines, currentYear, previousYear }: ProprietorCapitalNoteProps) {
  const storageKey = useMemo(() => {
    const engagementId = lines?.[0]?.engagement_id || 'local';
    return `capital-note-proprietor-${engagementId}`;
  }, [lines]);

  const [values, setValues] = useState<CapitalValues>({});
  const [autoMapped, setAutoMapped] = useState(false);

  // Get Capital group ledgers
  const capitalLedgers = useMemo(() => {
    return lines.filter(line => {
      const parent = (line.ledger_parent || '').toLowerCase();
      const primaryGroup = (line.ledger_primary_group || '').toLowerCase();
      return parent.includes('capital') || primaryGroup.includes('capital');
    });
  }, [lines]);

  // Auto-map values from trial balance
  const handleAutoMap = () => {
    const newValues: CapitalValues = {};
    
    // Initialize all items with zero
    [...OWNER_CAPITAL_ITEMS.credits, ...OWNER_CAPITAL_ITEMS.debits].forEach(item => {
      newValues[item.key] = { current: 0, previous: 0 };
    });

    // Try to auto-map from capital ledgers
    capitalLedgers.forEach(ledger => {
      const name = ledger.account_name.toLowerCase();
      const balance = Math.abs(Number(ledger.closing_balance));
      const isPrevious = ledger.period_type === 'previous';
      
      [...OWNER_CAPITAL_ITEMS.credits, ...OWNER_CAPITAL_ITEMS.debits].forEach(item => {
        const matched = item.autoMap.some(pattern => name.includes(pattern.toLowerCase()));
        if (matched) {
          if (isPrevious) {
            newValues[item.key].previous += balance;
          } else {
            newValues[item.key].current += balance;
          }
        }
      });
    });

    setValues(newValues);
    setAutoMapped(true);
  };

  // Initialize values on mount
  useEffect(() => {
    const initialValues: CapitalValues = {};
    [...OWNER_CAPITAL_ITEMS.credits, ...OWNER_CAPITAL_ITEMS.debits].forEach(item => {
      initialValues[item.key] = { current: 0, previous: 0 };
    });
    setValues(initialValues);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.values) setValues(parsed.values);
      if (typeof parsed.autoMapped === 'boolean') setAutoMapped(parsed.autoMapped);
    } catch (error) {
      console.error('Failed to load proprietor capital note', error);
    }
  }, [storageKey]);

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify({ values, autoMapped }));
  };

  const handleValueChange = (key: string, field: 'current' | 'previous', value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: numValue }
    }));
  };

  // Calculate totals
  const creditTotal = useMemo(() => {
    return OWNER_CAPITAL_ITEMS.credits.reduce((sum, item) => ({
      current: sum.current + (values[item.key]?.current || 0),
      previous: sum.previous + (values[item.key]?.previous || 0)
    }), { current: 0, previous: 0 });
  }, [values]);

  const debitTotal = useMemo(() => {
    return OWNER_CAPITAL_ITEMS.debits.reduce((sum, item) => ({
      current: sum.current + (values[item.key]?.current || 0),
      previous: sum.previous + (values[item.key]?.previous || 0)
    }), { current: 0, previous: 0 });
  }, [values]);

  const netTotal = useMemo(() => ({
    current: (values['opening_balance']?.current || 0) + creditTotal.current - debitTotal.current,
    previous: (values['opening_balance']?.previous || 0) + creditTotal.previous - debitTotal.previous
  }), [values, creditTotal, debitTotal]);

  // TB validation
  const tbCapitalTotal = useMemo(() => {
    return capitalLedgers
      .filter(l => l.period_type !== 'previous')
      .reduce((sum, l) => sum + Math.abs(Number(l.closing_balance)), 0);
  }, [capitalLedgers]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-';
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Owner's Capital Account</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoMap}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-Map from TB
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Validation Message */}
        {autoMapped && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            Math.abs(netTotal.current - tbCapitalTotal) < 1 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            TB Capital Total: {formatCurrency(tbCapitalTotal)} | 
            Computed Closing: {formatCurrency(netTotal.current)}
            {Math.abs(netTotal.current - tbCapitalTotal) >= 1 && (
              <span className="ml-2">(Difference: {formatCurrency(Math.abs(netTotal.current - tbCapitalTotal))})</span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Particulars</TableHead>
                <TableHead className="text-right w-[150px]">
                  As at {currentYear || 'Current Year'}
                </TableHead>
                {previousYear && (
                  <TableHead className="text-right w-[150px]">
                    As at {previousYear}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Credit Items */}
              {OWNER_CAPITAL_ITEMS.credits.map((item, idx) => (
                <TableRow key={item.key} className={idx === 0 ? 'bg-muted/50' : ''}>
                  <TableCell className={idx === 0 ? 'font-semibold' : ''}>{item.label}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-full text-right h-8"
                      value={values[item.key]?.current || ''}
                      onChange={(e) => handleValueChange(item.key, 'current', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  {previousYear && (
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-full text-right h-8"
                        value={values[item.key]?.previous || ''}
                        onChange={(e) => handleValueChange(item.key, 'previous', e.target.value)}
                        placeholder="0.00"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Total Credits */}
              <TableRow className="bg-primary/10 font-semibold">
                <TableCell>Total of Credit Side</TableCell>
                <TableCell className="text-right">{formatCurrency(creditTotal.current)}</TableCell>
                {previousYear && (
                  <TableCell className="text-right">{formatCurrency(creditTotal.previous)}</TableCell>
                )}
              </TableRow>

              {/* Less Header */}
              <TableRow className="bg-muted">
                <TableCell colSpan={previousYear ? 3 : 2} className="font-semibold">Less:</TableCell>
              </TableRow>

              {/* Debit Items */}
              {OWNER_CAPITAL_ITEMS.debits.map((item) => (
                <TableRow key={item.key}>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-full text-right h-8"
                      value={values[item.key]?.current || ''}
                      onChange={(e) => handleValueChange(item.key, 'current', e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  {previousYear && (
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="w-full text-right h-8"
                        value={values[item.key]?.previous || ''}
                        onChange={(e) => handleValueChange(item.key, 'previous', e.target.value)}
                        placeholder="0.00"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Total Debits */}
              <TableRow className="bg-destructive/10 font-semibold">
                <TableCell>Total of Debit Side</TableCell>
                <TableCell className="text-right">{formatCurrency(debitTotal.current)}</TableCell>
                {previousYear && (
                  <TableCell className="text-right">{formatCurrency(debitTotal.previous)}</TableCell>
                )}
              </TableRow>

              {/* Net Total */}
              <TableRow className="bg-primary/20 font-bold text-lg">
                <TableCell>Total (Net of Opening + Credit – Debit)</TableCell>
                <TableCell className="text-right">{formatCurrency(netTotal.current)}</TableCell>
                {previousYear && (
                  <TableCell className="text-right">{formatCurrency(netTotal.previous)}</TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

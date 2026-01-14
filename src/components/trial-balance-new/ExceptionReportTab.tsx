import { useMemo } from 'react';
import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { getNaturalBalanceSide, BalanceSign } from '@/utils/naturalBalance';
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableContainer,
  DenseTableHead,
  DenseTableHeader,
  DenseTableRow,
} from '@/components/ui/dense-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface ExceptionItem {
  ledgerName: string;
  group: string;
  balance: number;
  expectedSign: 'Dr' | 'Cr';
  actualSign: 'Dr' | 'Cr';
  classification?: string;
}

interface Props {
  classifiedData: LedgerRow[];
}

export function ExceptionReportTab({ classifiedData }: Props) {
  const exceptions = useMemo(() => {
    const result: Record<string, ExceptionItem[]> = {
      debtorsCredit: [],
      creditorsDebit: [],
      loansDebit: [],
      bankCredit: [],
      loansAdvancesCredit: [],
    };

    if (!classifiedData || !Array.isArray(classifiedData)) return result;

    classifiedData.forEach(row => {
      const group = (row['Primary Group'] || '').toLowerCase();
      const closing = Number(row['Closing Balance'] || 0);
      if (closing === 0) return; // skip zero balance

      const expectedSign: BalanceSign = getNaturalBalanceSide(row);
      const actualSign: BalanceSign = closing < 0 ? 'Dr' : 'Cr';
      const displayBalance = Math.abs(closing);

      // Rule 1: Debtors with Credit balance
      if ((group.includes('debtor') || group.includes('sundry debtor')) && actualSign !== expectedSign) {
        result.debtorsCredit.push({
          ledgerName: row['Ledger Name'] || '',
          group: row['Primary Group'] || '',
          balance: displayBalance,
          expectedSign,
          actualSign,
          classification: row.H2,
        });
      }

      // Rule 2: Creditors with Debit balance
      if ((group.includes('creditor') || group.includes('sundry creditor')) && actualSign !== expectedSign) {
        result.creditorsDebit.push({
          ledgerName: row['Ledger Name'] || '',
          group: row['Primary Group'] || '',
          balance: displayBalance,
          expectedSign,
          actualSign,
          classification: row.H2,
        });
      }

      // Rule 3: Loans/OD/CC with Debit balance
      if ((group.includes('loan') || group.includes('bank od') || group.includes('bank o.d') || 
           group.includes('cash credit') || group.includes('overdraft')) && actualSign !== expectedSign) {
        result.loansDebit.push({
          ledgerName: row['Ledger Name'] || '',
          group: row['Primary Group'] || '',
          balance: displayBalance,
          expectedSign,
          actualSign,
          classification: row.H2,
        });
      }

      // Rule 4: Bank accounts with Credit balance
      if (group.includes('bank account') && actualSign !== expectedSign) {
        result.bankCredit.push({
          ledgerName: row['Ledger Name'] || '',
          group: row['Primary Group'] || '',
          balance: displayBalance,
          expectedSign,
          actualSign,
          classification: row.H2,
        });
      }

      // Rule 5: Loans & Advances (Assets) with Credit balance
      if (group.includes('loans and advances') && row.H1 === 'Balance Sheet' && actualSign !== expectedSign) {
        result.loansAdvancesCredit.push({
          ledgerName: row['Ledger Name'] || '',
          group: row['Primary Group'] || '',
          balance: displayBalance,
          expectedSign,
          actualSign,
          classification: row.H2,
        });
      }
    });

    return result;
  }, [classifiedData]);

  const totalExceptions = Object.values(exceptions).reduce((sum, arr) => sum + arr.length, 0);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    Object.entries(exceptions).forEach(([key, items]) => {
      if (items.length > 0) {
        const data = items.map(item => ({
          'Ledger Name': item.ledgerName,
          'Primary Group': item.group,
          'Balance': formatAmount(item.balance),
          'Expected': item.expectedSign,
          'Actual': item.actualSign,
          'Classification': item.classification || 'Not Classified',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const sheetName = key.replace(/([A-Z])/g, ' $1').trim();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    XLSX.writeFile(wb, 'Exception_Report.xlsx');
  };

  const renderExceptionSection = (title: string, description: string, items: ExceptionItem[]) => {
    if (items.length === 0) return null;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {title}
                <Badge variant="destructive">{items.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DenseTableContainer maxHeight="300px">
            <DenseTable>
              <DenseTableHeader>
                <DenseTableRow>
                  <DenseTableHead className="w-12">#</DenseTableHead>
                  <DenseTableHead>Ledger Name</DenseTableHead>
                  <DenseTableHead>Primary Group</DenseTableHead>
                  <DenseTableHead className="text-right">Balance</DenseTableHead>
                  <DenseTableHead className="text-center">Expected</DenseTableHead>
                  <DenseTableHead className="text-center">Actual</DenseTableHead>
                  <DenseTableHead>Classification</DenseTableHead>
                </DenseTableRow>
              </DenseTableHeader>
              <DenseTableBody>
                {items.map((item, index) => (
                  <DenseTableRow key={index}>
                    <DenseTableCell>{index + 1}</DenseTableCell>
                    <DenseTableCell className="font-medium">{item.ledgerName}</DenseTableCell>
                    <DenseTableCell className="text-muted-foreground">{item.group}</DenseTableCell>
                    <DenseTableCell className="text-right font-mono">
                      {formatAmount(item.balance)}
                    </DenseTableCell>
                    <DenseTableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{item.expectedSign}</Badge>
                    </DenseTableCell>
                    <DenseTableCell className="text-center">
                      <Badge variant="destructive" className="text-xs">{item.actualSign}</Badge>
                    </DenseTableCell>
                    <DenseTableCell>
                      {item.classification ? (
                        <Badge variant="secondary" className="text-xs">{item.classification}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not Classified</span>
                      )}
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseTable>
          </DenseTableContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exception Report</h2>
          <p className="text-sm text-muted-foreground">
            Ledgers with abnormal debit/credit balances based on their primary group
          </p>
        </div>
        {totalExceptions > 0 && (
          <Button onClick={exportToExcel} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        )}
      </div>

      {totalExceptions === 0 ? (
        <Alert>
          <AlertDescription>
            No exceptions found. All ledger balances appear normal based on their primary groups.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Found {totalExceptions} exception(s) requiring review
            </AlertDescription>
          </Alert>

          {renderExceptionSection(
            'Debtors with Credit Balance',
            'Sundry Debtors typically have debit balances. Credit balances may indicate advance payments or accounting errors.',
            exceptions.debtorsCredit
          )}

          {renderExceptionSection(
            'Creditors with Debit Balance',
            'Sundry Creditors typically have credit balances. Debit balances may indicate advance payments or returns.',
            exceptions.creditorsDebit
          )}

          {renderExceptionSection(
            'Loans/Overdrafts with Debit Balance',
            'Loans, Bank OD, and Cash Credit accounts typically have credit balances (liability). Debit balances are unusual.',
            exceptions.loansDebit
          )}

          {renderExceptionSection(
            'Bank Accounts with Credit Balance',
            'Bank accounts typically have debit balances (asset). Credit balances may indicate overdrafts.',
            exceptions.bankCredit
          )}

          {renderExceptionSection(
            'Loans & Advances (Assets) with Credit Balance',
            'Loans & Advances as assets typically have debit balances. Credit balances require investigation.',
            exceptions.loansAdvancesCredit
          )}
        </>
      )}
    </div>
  );
}

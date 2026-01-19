import React from 'react';

type Totals = {
  opening: number;
  debit: number;
  credit: number;
  closing: number;
};

type TotalsBarProps = {
  totals: Totals;
  formatNumber: (value?: number) => string;
};

export const TotalsBar = React.memo(({ totals, formatNumber }: TotalsBarProps) => {
  return (
    <div className="flex items-center justify-end gap-4 px-2 py-0.5 bg-gray-50 border-b text-[10px]" style={{ minHeight: '20px' }}>
      <span className="text-muted-foreground">
        Opening: <strong className="text-foreground font-semibold">{formatNumber(totals.opening)}</strong>
      </span>
      <span className="text-muted-foreground">
        Debit: <strong className="text-foreground font-semibold">{formatNumber(totals.debit)}</strong>
      </span>
      <span className="text-muted-foreground">
        Credit: <strong className="text-foreground font-semibold">{formatNumber(totals.credit)}</strong>
      </span>
      <span className="text-muted-foreground">
        Closing: <strong className="text-foreground font-semibold">{formatNumber(totals.closing)}</strong>
      </span>
    </div>
  );
});
TotalsBar.displayName = 'TotalsBar';

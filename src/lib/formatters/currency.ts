// Shared currency formatting utilities (exact logic copied from existing components)
export type ReportingScale =
  | 'rupees'
  | 'hundreds'
  | 'thousands'
  | 'lakhs'
  | 'millions'
  | 'crores'
  | 'auto';

export function formatCurrency(
  amount: number,
  reportingScale: ReportingScale = 'auto',
  options?: { includeSymbol?: boolean }
): string {
  if (amount === 0) return '-';
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount);
  const symbol = options?.includeSymbol ? '₹' : '';

  switch (reportingScale) {
    case 'rupees':
      return `${sign}${symbol}${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    case 'hundreds':
      return `${sign}${symbol}${(absAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'thousands':
      return `${sign}${symbol}${(absAmount / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'lakhs':
      return `${sign}${symbol}${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'millions':
      return `${sign}${symbol}${(absAmount / 1000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'crores':
      return `${sign}${symbol}${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'auto':
    default:
      if (absAmount >= 10000000) {
        return `${sign}${symbol}${(absAmount / 10000000).toFixed(2)} Cr`;
      } else if (absAmount >= 100000) {
        return `${sign}${symbol}${(absAmount / 100000).toFixed(2)} L`;
      }
      return `${sign}${symbol}${absAmount.toLocaleString('en-IN')}`;
  }
}

export function getScaleLabel(reportingScale: ReportingScale): string {
  switch (reportingScale) {
     case 'rupees': return '(Amount in ₹)';
    case 'hundreds': return "(Amount in 100's)";
    case 'thousands': return "(Amount in 1000's)";
    case 'lakhs': return '(Amount in Lakhs)';
    case 'millions': return '(Amount in Millions)';
    case 'crores': return '(Amount in Crores)';
    case 'auto':
    default: return '';
  }
}

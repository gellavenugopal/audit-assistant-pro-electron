import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskSummaryProps {
  high: number;
  medium: number;
  low: number;
}

export function RiskSummary({ high, medium, low }: RiskSummaryProps) {
  const total = high + medium + low;
  
  return (
    <div className="audit-card">
      <h3 className="font-semibold text-foreground mb-4">Risk Distribution</h3>
      
      {/* Visual Distribution */}
      <div className="flex h-4 rounded-full overflow-hidden mb-4">
        {high > 0 && (
          <div
            className="bg-destructive transition-all duration-500"
            style={{ width: `${(high / total) * 100}%` }}
          />
        )}
        {medium > 0 && (
          <div
            className="bg-warning transition-all duration-500"
            style={{ width: `${(medium / total) * 100}%` }}
          />
        )}
        {low > 0 && (
          <div
            className="bg-success transition-all duration-500"
            style={{ width: `${(low / total) * 100}%` }}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xl font-bold text-foreground">{high}</span>
          </div>
          <p className="text-xs text-muted-foreground">High Risk</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span className="text-xl font-bold text-foreground">{medium}</span>
          </div>
          <p className="text-xs text-muted-foreground">Medium Risk</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-xl font-bold text-foreground">{low}</span>
          </div>
          <p className="text-xs text-muted-foreground">Low Risk</p>
        </div>
      </div>
    </div>
  );
}

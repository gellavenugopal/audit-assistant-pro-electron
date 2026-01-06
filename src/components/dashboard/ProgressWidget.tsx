import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressItem {
  label: string;
  value: number;
  total: number;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

interface ProgressWidgetProps {
  title: string;
  items: ProgressItem[];
}

export function ProgressWidget({ title, items }: ProgressWidgetProps) {
  return (
    <div className="audit-card">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-4">
        {items.map((item, index) => {
          const percentage = Math.round((item.value / item.total) * 100);
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">
                  {item.value}/{item.total}
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    item.color === 'success' && 'bg-success',
                    item.color === 'warning' && 'bg-warning',
                    item.color === 'danger' && 'bg-destructive',
                    (!item.color || item.color === 'default') && 'bg-primary'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

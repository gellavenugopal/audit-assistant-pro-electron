import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        success: 'bg-success/15 text-success border border-success/20',
        warning: 'bg-warning/15 text-warning border border-warning/20',
        danger: 'bg-destructive/15 text-destructive border border-destructive/20',
        info: 'bg-info/15 text-info border border-info/20',
        purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ children, variant, className, dot = true }: StatusBadgeProps) {
  const dotColors = {
    default: 'bg-muted-foreground',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-info',
    purple: 'bg-purple-400',
  };

  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant || 'default'])} />
      )}
      {children}
    </span>
  );
}

// Utility function to get status badge variant
export function getStatusVariant(status: string): VariantProps<typeof statusBadgeVariants>['variant'] {
  switch (status.toLowerCase()) {
    case 'complete':
    case 'completed':
    case 'done':
    case 'approved':
    case 'cleared':
    case 'responded':
      return 'success';
    case 'in_progress':
    case 'in progress':
    case 'fieldwork':
    case 'open':
      return 'warning';
    case 'not_started':
    case 'not started':
    case 'pending':
    case 'planning':
      return 'info';
    case 'review':
    case 'reviewed':
      return 'purple';
    case 'locked':
    case 'blocked':
    case 'reopened':
      return 'danger';
    default:
      return 'default';
  }
}

export function getRiskVariant(level: string): VariantProps<typeof statusBadgeVariants>['variant'] {
  switch (level.toLowerCase()) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
}

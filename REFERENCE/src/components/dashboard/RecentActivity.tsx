import { formatDistanceToNow } from 'date-fns';
import { Activity, FileCheck, CheckCircle, Upload, LogIn, UserPlus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  entity: string;
  details: string | null;
  created_at: string;
}

interface RecentActivityProps {
  events: ActivityLog[];
  loading?: boolean;
}

const getEventIcon = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('login') || lowerAction.includes('signed in')) return LogIn;
  if (lowerAction.includes('signup') || lowerAction.includes('registered')) return UserPlus;
  if (lowerAction.includes('upload')) return Upload;
  if (lowerAction.includes('delete')) return Trash2;
  if (lowerAction.includes('update') || lowerAction.includes('edit')) return Edit;
  if (lowerAction.includes('complete') || lowerAction.includes('approve')) return CheckCircle;
  if (lowerAction.includes('review')) return FileCheck;
  return Activity;
};

const getEventColor = (action: string) => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('delete')) return 'text-destructive bg-destructive/10';
  if (lowerAction.includes('complete') || lowerAction.includes('approve')) return 'text-success bg-success/10';
  if (lowerAction.includes('review')) return 'text-info bg-info/10';
  if (lowerAction.includes('create') || lowerAction.includes('upload')) return 'text-primary bg-primary/10';
  if (lowerAction.includes('login') || lowerAction.includes('signed')) return 'text-amber-500 bg-amber-500/10';
  return 'text-muted-foreground bg-muted';
};

export function RecentActivity({ events, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="audit-card">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="audit-card">
      <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.slice(0, 6).map((event) => {
            const Icon = getEventIcon(event.action);
            const colorClass = getEventColor(event.action);
            
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className={cn('p-1.5 rounded-lg shrink-0', colorClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{event.user_name}</span>
                    {' '}
                    <span className="text-muted-foreground">{event.action.toLowerCase()}</span>
                    {' '}
                    <span>{event.entity.toLowerCase()}</span>
                  </p>
                  {event.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {event.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

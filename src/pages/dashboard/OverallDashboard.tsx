import { AlertTriangle, Briefcase, CalendarClock, FolderOpen, TrendingUp } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useOverallDashboardData } from '@/hooks/useOverallDashboardData';

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export function OverallDashboard() {
  const { data, loading } = useOverallDashboardData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Engagement Pipeline
            </h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Planning', value: data.pipeline.planning },
                  { label: 'Fieldwork', value: data.pipeline.fieldwork },
                  { label: 'Review', value: data.pipeline.review },
                  { label: 'Completed', value: data.pipeline.completed },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
                <div className="pt-2 text-xs text-muted-foreground">
                  Total engagements: {data.pipeline.total}
                </div>
              </div>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Due Soon
            </h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-4 text-sm">
                {data.dueSoon.map((group) => (
                  <div key={group.days}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Next {group.days} days
                    </p>
                    {group.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No upcoming due dates</p>
                    ) : (
                      <div className="space-y-2">
                        {group.items.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.client_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.name}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                        {group.items.length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            +{group.items.length - 4} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Portfolio Risk Summary
            </h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Open risks</span>
                  <span className="font-medium text-foreground">{data.riskSummary.open}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className={cn('font-medium', data.riskSummary.high > 0 && 'text-destructive')}>
                    High: {data.riskSummary.high}
                  </span>
                  <span>Medium: {data.riskSummary.medium}</span>
                  <span>Low: {data.riskSummary.low}</span>
                </div>
                <div className="pt-2 text-xs text-muted-foreground">
                  Total risks: {data.riskSummary.total}
                </div>
              </div>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              High Risk Engagements
            </h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : data.topHighRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">No high risk engagements yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {data.topHighRisk.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.client_name}</p>
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-destructive">
                      {item.highCount} high
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Review Notes Summary</h3>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Open</p>
                    <p className="text-lg font-semibold text-foreground">{data.reviewNotes.open}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Responded</p>
                    <p className="text-lg font-semibold text-foreground">{data.reviewNotes.responded}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Cleared</p>
                    <p className="text-lg font-semibold text-foreground">{data.reviewNotes.cleared}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>High: {data.reviewNotes.priorities.high}</span>
                  <span>Medium: {data.reviewNotes.priorities.medium}</span>
                  <span>Low: {data.reviewNotes.priorities.low}</span>
                </div>
              </div>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Evidence Vault
            </h3>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-muted/30 px-3 py-3">
                  <p className="text-xs text-muted-foreground">Files</p>
                  <p className="text-xl font-semibold text-foreground">{data.evidence.totalFiles}</p>
                </div>
                <div className="rounded-lg bg-muted/30 px-3 py-3">
                  <p className="text-xs text-muted-foreground">Total Size</p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatFileSize(data.evidence.totalSize)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <RecentActivity events={data.recentActivity} loading={loading} />
        </div>
      </div>
    </div>
  );
}

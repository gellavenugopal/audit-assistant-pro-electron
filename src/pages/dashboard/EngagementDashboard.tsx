import { CheckCircle2, Circle, ClipboardCheck, FileCheck, FolderOpen } from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEngagementDashboardData } from '@/hooks/useEngagementDashboardData';

interface EngagementDashboardProps {
  engagementId?: string;
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export function EngagementDashboard({ engagementId }: EngagementDashboardProps) {
  const { data, loading } = useEngagementDashboardData(engagementId);
  const executionProgress =
    data.auditExecution.total > 0
      ? Math.round((data.auditExecution.complete / data.auditExecution.total) * 100)
      : 0;

  if (!engagementId && !loading) {
    return (
      <div className="audit-card text-center text-muted-foreground py-10">
        Select an engagement to see its dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Readiness Checklist
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data.readiness.map((item) => {
                  const Icon = item.complete ? CheckCircle2 : Circle;
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          'h-4 w-4 mt-0.5',
                          item.complete ? 'text-success' : 'text-muted-foreground'
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        {item.detail && (
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Financial Review Snapshot</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data.financialReview.map((period) => (
                  <div key={period.periodType} className="rounded-lg border border-muted px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{period.periodType}</p>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          period.hasData ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {period.hasData ? 'TB loaded' : 'No TB'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span>{period.totalLines} ledgers</span>
                      <span>{period.classifiedLines} classified</span>
                      <span>{period.unclassifiedLines} unclassified</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {period.classificationComplete ? 'Classification complete' : 'Classification pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Audit Execution Progress
            </h3>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>Completed</span>
                  <span className="font-medium text-foreground">
                    {data.auditExecution.complete}/{data.auditExecution.total}
                  </span>
                </div>
                <Progress value={executionProgress} className="h-2" />
              </>
            )}
          </div>

          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Review Notes</h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
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
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Age 0-7d: {data.reviewNotes.ageing.lt7}</span>
                  <span>8-30d: {data.reviewNotes.ageing.lt30}</span>
                  <span>30d+: {data.reviewNotes.ageing.gt30}</span>
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

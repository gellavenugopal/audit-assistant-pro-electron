import { useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskSummary } from '@/components/dashboard/RiskSummary';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useEngagement } from '@/contexts/EngagementContext';
import { 
  FileCheck, 
  Briefcase, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  FolderOpen,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { currentEngagement } = useEngagement();
  const [view, setView] = useState<'engagement' | 'overall'>('engagement');
  const scopedEngagementId = view === 'engagement' ? currentEngagement?.id : undefined;
  const { stats, loading } = useDashboardStats(scopedEngagementId);
  const { members, loading: membersLoading } = useTeamMembers(scopedEngagementId);
  const activeEngagement = view === 'engagement' ? currentEngagement : null;
  const materialitySource = view === 'engagement' ? activeEngagement : stats.latestEngagement;
  
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '\u2014';
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
    return `\u20B9${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {view === 'overall' ? 'Overall Dashboard' : 'Engagement Dashboard'}
          </h1>
          {loading ? (
            <Skeleton className="h-5 w-48 mt-1" />
          ) : activeEngagement ? (
            <p className="text-muted-foreground mt-1">
              {activeEngagement.client_name} - {activeEngagement.name}
            </p>
          ) : view === 'overall' ? (
            <p className="text-muted-foreground mt-1">All engagements</p>
          ) : (
            <p className="text-muted-foreground mt-1">No engagements yet</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(value) => setView(value as 'engagement' | 'overall')}>
            <TabsList>
              <TabsTrigger value="engagement" className="data-[state=active]:text-white">Engagement</TabsTrigger>
              <TabsTrigger value="overall" className="data-[state=active]:text-white">Overall</TabsTrigger>
            </TabsList>
          </Tabs>
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : activeEngagement ? (
            <>
              <StatusBadge variant={getStatusVariant(activeEngagement.status)}>
                {activeEngagement.status.charAt(0).toUpperCase() + activeEngagement.status.slice(1)}
              </StatusBadge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>FY: {activeEngagement.financial_year}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Active Engagements"
              value={stats.engagements.active}
              subtitle={`${stats.engagements.total} total engagements`}
              icon={Briefcase}
              variant="default"
            />
            <StatCard
              title="Open Risks"
              value={stats.risks.open}
              subtitle={`${stats.risks.total} total risks identified`}
              icon={AlertTriangle}
              variant={stats.risks.high > 2 ? 'danger' : stats.risks.high > 0 ? 'warning' : 'success'}
            />
            <StatCard
              title={view === 'engagement' ? 'Materiality & Risk Assessment' : 'Latest Materiality & Risk Assessment'}
              value={formatCurrency(materialitySource?.materiality_amount || null)}
              subtitle={`PM: ${formatCurrency(materialitySource?.performance_materiality || null)}`}
              icon={TrendingUp}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Progress & Risk */}
        <div className="space-y-6">
          <RiskSummary
            high={stats.risks.high}
            medium={stats.risks.medium}
            low={stats.risks.low}
          />
        </div>

        {/* Center Column - Team & Stats */}
        <div className="space-y-6">
          {/* Team Overview */}
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Team Members</h3>
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
                {members.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{members.length - 5} more members
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Evidence Stats */}
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Evidence Vault</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <FolderOpen className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold text-foreground">{stats.evidence.totalFiles}</p>
                <p className="text-xs text-muted-foreground">Files Uploaded</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <FileCheck className="h-6 w-6 mx-auto text-success mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {stats.evidence.totalSize > 0 
                    ? `${(stats.evidence.totalSize / (1024 * 1024)).toFixed(1)} MB`
                    : '0 MB'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Total Size</p>
              </div>
            </div>
          </div>

          {/* Engagement Summary */}
          <div className="audit-card">
            <h3 className="font-semibold text-foreground mb-4">Engagement Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Planning</span>
                <span className="text-sm font-medium text-foreground">{stats.engagements.planning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="text-sm font-medium text-foreground">{stats.engagements.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-medium text-foreground">{stats.engagements.completed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity */}
        <div>
          <RecentActivity events={stats.recentActivity} loading={loading} />
        </div>
      </div>
    </div>
  );
}

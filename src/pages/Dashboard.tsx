import { useState } from 'react';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEngagement } from '@/contexts/EngagementContext';
import { Calendar } from 'lucide-react';
import { EngagementDashboard } from '@/pages/dashboard/EngagementDashboard';
import { OverallDashboard } from '@/pages/dashboard/OverallDashboard';

export default function Dashboard() {
  const { currentEngagement } = useEngagement();
  const [view, setView] = useState<'engagement' | 'overall'>('engagement');
  const activeEngagement = view === 'engagement' ? currentEngagement : null;
  const showSkeleton = view === 'engagement' && !currentEngagement;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {view === 'overall' ? 'Overall Dashboard' : 'Engagement Dashboard'}
          </h1>
          {showSkeleton ? (
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
          {showSkeleton ? (
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

      {view === 'engagement' ? (
        <EngagementDashboard engagementId={currentEngagement?.id} />
      ) : (
        <OverallDashboard />
      )}
    </div>
  );
}

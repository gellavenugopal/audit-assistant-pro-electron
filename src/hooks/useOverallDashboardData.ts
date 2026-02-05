import { useEffect, useState } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

type ActivityLog = {
  id: string;
  user_name: string;
  action: string;
  entity: string;
  details: string | null;
  created_at: string;
};

type DueSoonItem = {
  id: string;
  name: string;
  client_name: string;
  end_date: string;
  status: string;
};

type DueSoonGroup = {
  days: number;
  items: DueSoonItem[];
};

interface OverallDashboardData {
  pipeline: {
    planning: number;
    fieldwork: number;
    review: number;
    completed: number;
    total: number;
  };
  dueSoon: DueSoonGroup[];
  riskSummary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    open: number;
  };
  topHighRisk: {
    id: string;
    name: string;
    client_name: string;
    highCount: number;
  }[];
  reviewNotes: {
    total: number;
    open: number;
    responded: number;
    cleared: number;
    priorities: {
      high: number;
      medium: number;
      low: number;
    };
  };
  evidence: {
    totalFiles: number;
    totalSize: number;
  };
  recentActivity: ActivityLog[];
}

const EMPTY_DATA: OverallDashboardData = {
  pipeline: {
    planning: 0,
    fieldwork: 0,
    review: 0,
    completed: 0,
    total: 0,
  },
  dueSoon: [
    { days: 7, items: [] },
    { days: 15, items: [] },
    { days: 30, items: [] },
  ],
  riskSummary: {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
  },
  topHighRisk: [],
  reviewNotes: {
    total: 0,
    open: 0,
    responded: 0,
    cleared: 0,
    priorities: {
      high: 0,
      medium: 0,
      low: 0,
    },
  },
  evidence: {
    totalFiles: 0,
    totalSize: 0,
  },
  recentActivity: [],
};

const dayInMs = 24 * 60 * 60 * 1000;

const computeDueSoon = (items: DueSoonItem[]): DueSoonGroup[] => {
  const now = new Date();
  const groups = [
    { days: 7, items: [] as DueSoonItem[] },
    { days: 15, items: [] as DueSoonItem[] },
    { days: 30, items: [] as DueSoonItem[] },
  ];

  items.forEach((item) => {
    const endDate = new Date(item.end_date);
    if (!Number.isFinite(endDate.getTime())) return;
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / dayInMs);
    if (diffDays < 0) return;
    if (diffDays <= 7) groups[0].items.push(item);
    else if (diffDays <= 15) groups[1].items.push(item);
    else if (diffDays <= 30) groups[2].items.push(item);
  });

  return groups;
};

export function useOverallDashboardData() {
  const [data, setData] = useState<OverallDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        engagementsRes,
        risksRes,
        evidenceRes,
        reviewNotesRes,
        activityRes,
      ] = await Promise.all([
        db
          .from('engagements')
          .select('id, name, client_name, status, end_date')
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .execute(),
        db
          .from('risks')
          .select('engagement_id, combined_risk, status')
          .execute(),
        db
          .from('evidence_files')
          .select('file_size')
          .execute(),
        db
          .from('review_notes')
          .select('status, priority')
          .execute(),
        db
          .from('activity_logs')
          .select('id, user_name, action, entity, details, created_at')
          .order('created_at', { ascending: false })
          .limit(10)
          .execute(),
      ]);

      const engagements = engagementsRes.data || [];
      const risks = risksRes.data || [];
      const evidence = evidenceRes.data || [];
      const reviewNotes = reviewNotesRes.data || [];

      const pipeline = {
        planning: engagements.filter((engagement) => engagement.status === 'planning').length,
        fieldwork: engagements.filter((engagement) => engagement.status === 'fieldwork').length,
        review: engagements.filter((engagement) => engagement.status === 'review').length,
        completed: engagements.filter((engagement) =>
          engagement.status === 'completed' || engagement.status === 'archived'
        ).length,
        total: engagements.length,
      };

      const dueSoonItems = engagements
        .filter((engagement) => Boolean(engagement.end_date))
        .map((engagement) => ({
          id: engagement.id,
          name: engagement.name,
          client_name: engagement.client_name,
          end_date: engagement.end_date as string,
          status: engagement.status,
        }));

      const riskSummary = {
        total: risks.length,
        high: risks.filter((risk) => risk.combined_risk === 'high').length,
        medium: risks.filter((risk) => risk.combined_risk === 'medium').length,
        low: risks.filter((risk) => risk.combined_risk === 'low').length,
        open: risks.filter((risk) => risk.status === 'open').length,
      };

      const highRiskByEngagement = new Map<string, number>();
      risks.forEach((risk) => {
        if (risk.combined_risk !== 'high') return;
        highRiskByEngagement.set(
          risk.engagement_id,
          (highRiskByEngagement.get(risk.engagement_id) || 0) + 1
        );
      });

      const engagementMap = new Map(engagements.map((engagement) => [engagement.id, engagement]));
      const topHighRisk = Array.from(highRiskByEngagement.entries())
        .map(([engagementId, highCount]) => {
          const engagement = engagementMap.get(engagementId);
          return {
            id: engagementId,
            name: engagement?.name || 'Unknown',
            client_name: engagement?.client_name || '',
            highCount,
          };
        })
        .sort((a, b) => b.highCount - a.highCount)
        .slice(0, 5);

      const reviewNotesSummary = {
        total: reviewNotes.length,
        open: reviewNotes.filter((note) => note.status === 'open').length,
        responded: reviewNotes.filter((note) => note.status === 'responded').length,
        cleared: reviewNotes.filter((note) => note.status === 'cleared').length,
        priorities: {
          high: reviewNotes.filter((note) => note.priority === 'high').length,
          medium: reviewNotes.filter((note) => note.priority === 'medium').length,
          low: reviewNotes.filter((note) => note.priority === 'low').length,
        },
      };

      const evidenceStats = {
        totalFiles: evidence.length,
        totalSize: evidence.reduce((sum, file) => sum + (file.file_size || 0), 0),
      };

      setData({
        pipeline,
        dueSoon: computeDueSoon(dueSoonItems),
        riskSummary,
        topHighRisk,
        reviewNotes: reviewNotesSummary,
        evidence: evidenceStats,
        recentActivity: (activityRes.data || []) as ActivityLog[],
      });
    } catch (error) {
      console.error('Error loading overall dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscriptions not available in SQLite
    // Use polling if real-time updates are needed
    // const interval = setInterval(fetchData, 30000);
    // return () => clearInterval(interval);
  }, []);

  return { data, loading, refetch: fetchData };
}

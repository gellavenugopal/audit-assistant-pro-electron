import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  engagements: {
    total: number;
    active: number;
    planning: number;
    completed: number;
  };
  risks: {
    total: number;
    high: number;
    medium: number;
    low: number;
    open: number;
  };
  evidence: {
    totalFiles: number;
    totalSize: number;
  };
  recentActivity: {
    id: string;
    user_name: string;
    action: string;
    entity: string;
    details: string | null;
    created_at: string;
  }[];
  latestEngagement: {
    id: string;
    name: string;
    client_name: string;
    status: string;
    financial_year: string;
    materiality_amount: number | null;
    performance_materiality: number | null;
  } | null;
}

export function useDashboardStats(engagementId?: string) {
  const [stats, setStats] = useState<DashboardStats>({
    engagements: { total: 0, active: 0, planning: 0, completed: 0 },
    risks: { total: 0, high: 0, medium: 0, low: 0, open: 0 },
    evidence: { totalFiles: 0, totalSize: 0 },
    recentActivity: [],
    latestEngagement: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Fetch all data in parallel
      let activityQuery = supabase
        .from('activity_logs')
        .select('id, user_name, action, entity, details, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (engagementId) {
        activityQuery = activityQuery.eq('engagement_id', engagementId);
      }

      const [
        engagementsRes,
        risksRes,
        evidenceRes,
        activityRes,
      ] = await Promise.all([
        supabase.from('engagements').select('id, name, client_name, status, financial_year, materiality_amount, performance_materiality'),
        engagementId
          ? supabase.from('risks').select('id, combined_risk, status').eq('engagement_id', engagementId)
          : supabase.from('risks').select('id, combined_risk, status'),
        engagementId
          ? supabase.from('evidence_files').select('id, file_size').eq('engagement_id', engagementId)
          : supabase.from('evidence_files').select('id, file_size'),
        activityQuery,
      ]);

      // Calculate engagement stats
      const engagements = engagementsRes.data || [];
      const selectedEngagement = engagementId
        ? engagements.find(e => e.id === engagementId) || null
        : null;

      const engagementStats = engagementId
        ? {
            total: selectedEngagement ? 1 : 0,
            active: selectedEngagement && (selectedEngagement.status === 'fieldwork' || selectedEngagement.status === 'review') ? 1 : 0,
            planning: selectedEngagement && selectedEngagement.status === 'planning' ? 1 : 0,
            completed: selectedEngagement && (selectedEngagement.status === 'completed' || selectedEngagement.status === 'archived') ? 1 : 0,
          }
        : {
            total: engagements.length,
            active: engagements.filter(e => e.status === 'fieldwork' || e.status === 'review').length,
            planning: engagements.filter(e => e.status === 'planning').length,
            completed: engagements.filter(e => e.status === 'completed' || e.status === 'archived').length,
          };

      // Calculate risk stats
      const risks = risksRes.data || [];
      const riskStats = {
        total: risks.length,
        high: risks.filter(r => r.combined_risk === 'high').length,
        medium: risks.filter(r => r.combined_risk === 'medium').length,
        low: risks.filter(r => r.combined_risk === 'low').length,
        open: risks.filter(r => r.status === 'open').length,
      };

      // Calculate evidence stats
      const evidence = evidenceRes.data || [];
      const evidenceStats = {
        totalFiles: evidence.length,
        totalSize: evidence.reduce((acc, f) => acc + (f.file_size || 0), 0),
      };

      // Get latest engagement
      const latestEngagement = engagementId
        ? selectedEngagement
        : engagements.length > 0
          ? engagements[0]
          : null;

      setStats({
        engagements: engagementStats,
        risks: riskStats,
        evidence: evidenceStats,
        recentActivity: activityRes.data || [],
        latestEngagement,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates for key tables
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagements' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId]);

  return { stats, loading, refetch: fetchStats };
}

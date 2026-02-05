import { useState, useEffect, useCallback } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

type ActivityLog = {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string | null;
  engagement_id: string | null;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

interface LogActivityParams {
  action: string;
  entity: string;
  entityId?: string;
  engagementId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLogs() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await db
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
        .execute();

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const logActivity = useCallback(
    async ({ action, entity, entityId, engagementId, details, metadata = {} }: LogActivityParams) => {
      if (!user || !profile) {
        console.warn('Cannot log activity: user not authenticated');
        return false;
      }

      try {
        const { error } = await db.from('activity_logs').insert({
          user_id: user.id,
          user_name: profile.full_name,
          action,
          entity,
          entity_id: entityId || null,
          engagement_id: engagementId || null,
          details: details || null,
          metadata: JSON.stringify(metadata),
        });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Error logging activity:', error);
        return false;
      }
    },
    [user, profile]
  );

  useEffect(() => {
    fetchLogs();

    // Real-time subscriptions not available in SQLite
    // Use polling if real-time updates are needed
    // const interval = setInterval(fetchLogs, 30000);
    // return () => clearInterval(interval);
  }, []);

  // Stats calculations
  const todayLogs = logs.filter((log) => {
    const today = new Date();
    const logDate = new Date(log.created_at);
    return logDate.toDateString() === today.toDateString();
  });

  const uniqueUsers = new Set(logs.map((log) => log.user_id)).size;

  return {
    logs,
    loading,
    logActivity,
    refetch: fetchLogs,
    stats: {
      total: logs.length,
      today: todayLogs.length,
      activeUsers: uniqueUsers,
    },
  };
}

// Singleton logger for use outside of React components
let logActivityFn: ((params: LogActivityParams) => Promise<boolean>) | null = null;

export function setActivityLogger(fn: (params: LogActivityParams) => Promise<boolean>) {
  logActivityFn = fn;
}

export async function logActivityGlobal(params: LogActivityParams): Promise<boolean> {
  if (logActivityFn) {
    return logActivityFn(params);
  }
  return false;
}

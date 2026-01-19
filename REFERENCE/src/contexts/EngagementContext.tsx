import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Engagement {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string;
  financial_year: string;
  engagement_type: string;
  status: string;
  materiality_amount: number | null;
  performance_materiality: number | null;
}

interface EngagementContextType {
  currentEngagement: Engagement | null;
  engagements: Engagement[];
  loading: boolean;
  setCurrentEngagement: (engagement: Engagement | null) => void;
  clearEngagement: () => void;
  refreshEngagements: () => Promise<void>;
}

const EngagementContext = createContext<EngagementContextType | undefined>(undefined);

const STORAGE_KEY = 'auditpro_current_engagement';

export function EngagementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentEngagement, setCurrentEngagementState] = useState<Engagement | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEngagements = async () => {
    if (!user) {
      setEngagements([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('engagements')
        .select('id, name, client_id, client_name, financial_year, engagement_type, status, materiality_amount, performance_materiality')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEngagements(data || []);
    } catch (error) {
      console.error('Error fetching engagements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved engagement from localStorage on mount
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCurrentEngagementState(parsed);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      fetchEngagements();
    } else {
      setCurrentEngagementState(null);
      setEngagements([]);
      setLoading(false);
    }
  }, [user]);

  const setCurrentEngagement = (engagement: Engagement | null) => {
    setCurrentEngagementState(engagement);
    if (engagement) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(engagement));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearEngagement = () => {
    setCurrentEngagementState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshEngagements = async () => {
    await fetchEngagements();
  };

  return (
    <EngagementContext.Provider
      value={{
        currentEngagement,
        engagements,
        loading,
        setCurrentEngagement,
        clearEngagement,
        refreshEngagements,
      }}
    >
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagement() {
  const context = useContext(EngagementContext);
  if (context === undefined) {
    throw new Error('useEngagement must be used within an EngagementProvider');
  }
  return context;
}

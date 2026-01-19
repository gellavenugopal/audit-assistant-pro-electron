import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

const SECTION_NAME = 'auditor_eligibility_certificate';

export function useEligibilityCertificate(engagementId?: string | null) {
  const { user } = useAuth();
  const [document, setDocument] = useState<Database['public']['Tables']['audit_report_documents']['Row'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!engagementId) {
      setDocument(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_report_documents')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('section_name', SECTION_NAME)
        .maybeSingle();

      if (error) throw error;
      setDocument(data || null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load eligibility certificate document', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  const saveDocument = useCallback(
    async (content_html: string, sectionTitle?: string) => {
      if (!engagementId) {
        setError('Select an engagement before saving');
        return null;
      }

      setSaving(true);
      try {
        const payload: Database['public']['Tables']['audit_report_documents']['Insert'] = {
          engagement_id: engagementId,
          section_name: SECTION_NAME,
          section_title: sectionTitle || 'Auditor Eligibility Certificate',
          content_html,
          changed_by: user?.id || null,
        };

        const { data, error } = await supabase
          .from('audit_report_documents')
          .upsert(payload, { onConflict: 'engagement_id,section_name' })
          .select('*')
          .single();

        if (error) throw error;
        setDocument(data);
        setError(null);
        return data;
      } catch (err: any) {
        console.error('Failed to save eligibility certificate document', err);
        setError(err.message || 'Failed to save document');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [engagementId, user?.id]
  );

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const refresh = useCallback(() => {
    fetchDocument();
  }, [fetchDocument]);

  return {
    document,
    loading,
    saving,
    error,
    saveDocument,
    refresh,
  };
}

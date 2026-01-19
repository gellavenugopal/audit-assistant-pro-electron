import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export function useAuditReportDocument(
  engagementId: string | null | undefined,
  sectionName: string,
  sectionTitle?: string
) {
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
        .eq('section_name', sectionName)
        .maybeSingle();

      if (error) throw error;
      setDocument(data || null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load audit report document', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [engagementId, sectionName]);

  const saveDocument = useCallback(
    async (contentHtml: string, overrideTitle?: string) => {
      if (!engagementId) {
        setError('Select an engagement before saving');
        return null;
      }

      setSaving(true);
      try {
        const payload: Database['public']['Tables']['audit_report_documents']['Insert'] = {
          engagement_id: engagementId,
          section_name: sectionName,
          section_title: overrideTitle || sectionTitle || sectionName,
          content_html: contentHtml,
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
        console.error('Failed to save audit report document', err);
        setError(err.message || 'Failed to save document');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [engagementId, sectionName, sectionTitle, user?.id]
  );

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  return {
    document,
    loading,
    saving,
    error,
    saveDocument,
    refresh: fetchDocument,
  };
}

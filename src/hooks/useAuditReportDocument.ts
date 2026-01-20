import { useCallback, useEffect, useState } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();

export function useAuditReportDocument(
  engagementId: string | null | undefined,
  sectionName: string,
  sectionTitle?: string
) {
  const { user } = useAuth();
  const [document, setDocument] = useState<any | null>(null);
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
      const { data, error } = await db
        .from('audit_report_documents')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('section_name', sectionName)
        .single();

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
        const payload = {
          engagement_id: engagementId,
          section_name: sectionName,
          section_title: overrideTitle || sectionTitle || sectionName,
          content_html: contentHtml,
          changed_by: user?.id || null,
        };

        // Check if document exists
        const existing = await db
          .from('audit_report_documents')
          .select('*')
          .eq('engagement_id', engagementId)
          .eq('section_name', sectionName)
          .single();

        let data, error;
        if (existing.data) {
          // Update existing
          const result = await db
            .from('audit_report_documents')
            .update(payload)
            .eq('engagement_id', engagementId)
            .eq('section_name', sectionName)
            .execute();
          data = result.data;
          error = result.error;
        } else {
          // Insert new
          const result = await db
            .from('audit_report_documents')
            .insert(payload)
            .execute();
          data = result.data;
          error = result.error;
        }

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

import { useCallback, useEffect, useState } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();

const SECTION_NAME = 'auditor_eligibility_certificate';

export function useEligibilityCertificate(engagementId?: string | null) {
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
        .eq('section_name', SECTION_NAME)
        .single();

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
        const payload = {
          engagement_id: engagementId,
          section_name: SECTION_NAME,
          section_title: sectionTitle || 'Auditor Eligibility Certificate',
          content_html,
          changed_by: user?.id || null,
        };

        // Check if document exists
        const existing = await db
          .from('audit_report_documents')
          .select('*')
          .eq('engagement_id', engagementId)
          .eq('section_name', SECTION_NAME)
          .single();

        let data, error;
        if (existing.data) {
          // Update existing
          const result = await db
            .from('audit_report_documents')
            .eq('engagement_id', engagementId)
            .eq('section_name', SECTION_NAME)
            .update(payload);
          data = result.data;
          error = result.error;
        } else {
          // Insert new
          const result = await db
            .from('audit_report_documents')
            .insert(payload);
          data = result.data;
          error = result.error;
        }

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

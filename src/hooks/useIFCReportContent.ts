import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const IFC_REPORT_CONTENT_SECTION = 'audit_report_ifc_content';
const IFC_REPORT_CONTENT_TITLE = 'IFC Report Content';

export interface MaterialWeakness {
  id: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
}

export interface SignificantDeficiency {
  id: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
}

export interface IFCReportContent {
  id: string;
  engagement_id: string;
  opinion_type: string;
  opinion_paragraph: string | null;
  basis_for_opinion: string | null;
  management_responsibility_section: string | null;
  auditor_responsibility_section: string | null;
  ifc_meaning_section: string | null;
  inherent_limitations_section: string | null;
  has_material_weaknesses: boolean;
  material_weaknesses: MaterialWeakness[];
  has_significant_deficiencies: boolean;
  significant_deficiencies: SignificantDeficiency[];
  additional_sections: any[];
  report_status: string;
  version_number: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useIFCReportContent(engagementId: string | undefined) {
  const [content, setContent] = useState<IFCReportContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDocumentStorage, setUseDocumentStorage] = useState(false);
  const { user } = useAuth();

  const shouldFallbackToDocuments = (err: any) => {
    if (!err) return false;
    const message = String(err.message || '').toLowerCase();
    return (
      err.code === '42P01' ||
      err.code === 'PGRST204' ||
      err.code === 'PGRST301' ||
      (message.includes('ifc_report_content') &&
        (message.includes('does not exist') ||
          message.includes('schema cache') ||
          message.includes('permission denied') ||
          message.includes('row-level security') ||
          message.includes('not authorized')))
    );
  };

  const normalizeContent = (data: Partial<IFCReportContent> = {}): IFCReportContent => ({
    id: data.id || crypto.randomUUID(),
    engagement_id: engagementId || data.engagement_id || '',
    opinion_type: data.opinion_type || 'unmodified',
    opinion_paragraph: data.opinion_paragraph ?? '',
    basis_for_opinion: data.basis_for_opinion ?? null,
    management_responsibility_section: data.management_responsibility_section ?? '',
    auditor_responsibility_section: data.auditor_responsibility_section ?? '',
    ifc_meaning_section: data.ifc_meaning_section ?? '',
    inherent_limitations_section: data.inherent_limitations_section ?? '',
    has_material_weaknesses: Boolean(data.has_material_weaknesses),
    material_weaknesses: Array.isArray(data.material_weaknesses) ? data.material_weaknesses : [],
    has_significant_deficiencies: Boolean(data.has_significant_deficiencies),
    significant_deficiencies: Array.isArray(data.significant_deficiencies)
      ? data.significant_deficiencies
      : [],
    additional_sections: Array.isArray(data.additional_sections) ? data.additional_sections : [],
    report_status: data.report_status || 'draft',
    version_number: data.version_number ?? 1,
    created_by: data.created_by || user?.id || '',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  });

  const fetchDocumentContent = async () => {
    if (!engagementId) return null;
    const { data, error } = await supabase
      .from('audit_report_documents')
      .select('*')
      .eq('engagement_id', engagementId)
      .eq('section_name', IFC_REPORT_CONTENT_SECTION)
      .maybeSingle();

    if (error) throw error;
    if (!data?.content_json) return null;
    const raw =
      typeof data.content_json === 'string'
        ? JSON.parse(data.content_json)
        : (data.content_json as Partial<IFCReportContent>);
    return normalizeContent({
      ...raw,
      id: data.id,
      engagement_id: data.engagement_id,
      updated_at: data.updated_at,
      created_at: data.created_at,
    });
  };

  const saveDocumentContent = async (nextContent: IFCReportContent) => {
    if (!engagementId) return false;
    const { error } = await supabase
      .from('audit_report_documents')
      .upsert(
        {
          engagement_id: engagementId,
          section_name: IFC_REPORT_CONTENT_SECTION,
          section_title: IFC_REPORT_CONTENT_TITLE,
          content_json: nextContent,
          changed_by: user?.id || null,
        },
        { onConflict: 'engagement_id,section_name' }
      );

    if (error) throw error;
    setContent(nextContent);
    return true;
  };

  useEffect(() => {
    if (engagementId) {
      fetchContent();
    }
  }, [engagementId]);

  const fetchContent = async () => {
    if (!engagementId) return;

    try {
      setLoading(true);
      if (!useDocumentStorage) {
        const { data, error } = await supabase
          .from('ifc_report_content')
          .select('*')
          .eq('engagement_id', engagementId)
          .maybeSingle();

        if (error) {
          if (shouldFallbackToDocuments(error)) {
            setUseDocumentStorage(true);
            const docContent = await fetchDocumentContent();
            setContent(docContent);
            setError(null);
            return;
          }
          throw error;
        }

        if (data) {
          setContent(normalizeContent(data));
          setError(null);
          return;
        }
      }

      const docContent = await fetchDocumentContent();
      setContent(docContent);
      setError(null);
    } catch (err: any) {
      if (shouldFallbackToDocuments(err)) {
        setUseDocumentStorage(true);
        const docContent = await fetchDocumentContent();
        setContent(docContent);
        setError(null);
        return;
      }
      console.error('Error fetching IFC report content:', err);
      setError(err.message);
      toast.error('Failed to load IFC report content');
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (updates: Partial<IFCReportContent>) => {
    if (!engagementId) return false;

    const baseContent = normalizeContent(content || {});
    const nextContent = normalizeContent({
      ...baseContent,
      ...updates,
      material_weaknesses: updates.material_weaknesses ?? baseContent.material_weaknesses,
      significant_deficiencies: updates.significant_deficiencies ?? baseContent.significant_deficiencies,
      has_material_weaknesses: updates.has_material_weaknesses ?? baseContent.has_material_weaknesses,
      has_significant_deficiencies: updates.has_significant_deficiencies ?? baseContent.has_significant_deficiencies,
      updated_at: new Date().toISOString(),
    });

    try {
      if (useDocumentStorage) {
        await saveDocumentContent(nextContent);
        toast.success('IFC report content saved');
        return true;
      }

      if (content) {
        const { error } = await supabase
          .from('ifc_report_content')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);

        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('ifc_report_content')
          .insert({
            engagement_id: engagementId,
            created_by: userData.user?.id,
            ...updates,
          });

        if (error) throw error;
      }

      await fetchContent();
      toast.success('IFC report content saved');
      return true;
    } catch (err: any) {
      if (shouldFallbackToDocuments(err)) {
        setUseDocumentStorage(true);
        await saveDocumentContent(nextContent);
        toast.success('IFC report content saved');
        return true;
      }
      console.error('Error saving IFC report content:', err);
      toast.error('Failed to save IFC report content');
      return false;
    }
  };

  const addMaterialWeakness = async (weakness: Omit<MaterialWeakness, 'id'>) => {
    const baseContent = normalizeContent(content || {});
    const newWeakness: MaterialWeakness = {
      id: crypto.randomUUID(),
      ...weakness,
    };

    return await saveContent({
      has_material_weaknesses: true,
      material_weaknesses: [...(baseContent.material_weaknesses || []), newWeakness],
    });
  };

  const removeMaterialWeakness = async (id: string) => {
    if (!content) return false;

    const updatedWeaknesses = content.material_weaknesses.filter(w => w.id !== id);
    return await saveContent({
      material_weaknesses: updatedWeaknesses,
      has_material_weaknesses: updatedWeaknesses.length > 0,
    });
  };

  const addSignificantDeficiency = async (deficiency: Omit<SignificantDeficiency, 'id'>) => {
    const baseContent = normalizeContent(content || {});
    const newDeficiency: SignificantDeficiency = {
      id: crypto.randomUUID(),
      ...deficiency,
    };

    return await saveContent({
      has_significant_deficiencies: true,
      significant_deficiencies: [...(baseContent.significant_deficiencies || []), newDeficiency],
    });
  };

  const removeSignificantDeficiency = async (id: string) => {
    if (!content) return false;

    const updatedDeficiencies = content.significant_deficiencies.filter(d => d.id !== id);
    return await saveContent({
      significant_deficiencies: updatedDeficiencies,
      has_significant_deficiencies: updatedDeficiencies.length > 0,
    });
  };

  return {
    content,
    loading,
    error,
    saveContent,
    addMaterialWeakness,
    removeMaterialWeakness,
    addSignificantDeficiency,
    removeSignificantDeficiency,
    refetch: fetchContent,
  };
}

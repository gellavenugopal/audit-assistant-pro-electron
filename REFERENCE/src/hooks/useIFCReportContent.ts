import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (engagementId) {
      fetchContent();
    }
  }, [engagementId]);

  const fetchContent = async () => {
    if (!engagementId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ifc_report_content')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (error) throw error;
      setContent(data);
    } catch (err: any) {
      console.error('Error fetching IFC report content:', err);
      setError(err.message);
      toast.error('Failed to load IFC report content');
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (updates: Partial<IFCReportContent>) => {
    if (!engagementId) return false;

    try {
      if (content) {
        // Update existing
        const { error } = await supabase
          .from('ifc_report_content')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', content.id);

        if (error) throw error;
      } else {
        // Create new
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
      console.error('Error saving IFC report content:', err);
      toast.error('Failed to save IFC report content');
      return false;
    }
  };

  const addMaterialWeakness = async (weakness: Omit<MaterialWeakness, 'id'>) => {
    if (!content) return false;

    const newWeakness: MaterialWeakness = {
      id: crypto.randomUUID(),
      ...weakness,
    };

    return await saveContent({
      has_material_weaknesses: true,
      material_weaknesses: [...(content.material_weaknesses || []), newWeakness],
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
    if (!content) return false;

    const newDeficiency: SignificantDeficiency = {
      id: crypto.randomUUID(),
      ...deficiency,
    };

    return await saveContent({
      has_significant_deficiencies: true,
      significant_deficiencies: [...(content.significant_deficiencies || []), newDeficiency],
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

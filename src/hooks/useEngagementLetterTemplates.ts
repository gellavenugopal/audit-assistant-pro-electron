import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EngagementLetterTemplate {
  id: string;
  template_type: 'statutory_audit_company_without_ifc' | 'statutory_audit_company_with_ifc' | 'tax_audit_partnership_3ca' | 'tax_audit_partnership_3cb';
  template_name: string;
  file_content: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
}

export function useEngagementLetterTemplates() {
  const [templates, setTemplates] = useState<EngagementLetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('engagement_letter_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load engagement letter templates');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateByType = (type: string): EngagementLetterTemplate | null => {
    return templates.find(t => t.template_type === type) || null;
  };

  const uploadTemplate = async (
    templateType: EngagementLetterTemplate['template_type'],
    templateName: string,
    fileContent: string,
    fileName: string
  ): Promise<boolean> => {
    try {
      // Check if template already exists
      const existing = templates.find(t => t.template_type === templateType);

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('engagement_letter_templates')
          .update({
            template_name: templateName,
            file_content: fileContent,
            file_name: fileName,
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        // Insert new template
        const { error } = await supabase
          .from('engagement_letter_templates')
          .insert({
            template_type: templateType,
            template_name: templateName,
            file_content: fileContent,
            file_name: fileName,
          });

        if (error) throw error;
        toast.success('Template uploaded successfully');
      }

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error(error.message || 'Failed to upload template');
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('engagement_letter_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
      return false;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    getTemplateByType,
    uploadTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}

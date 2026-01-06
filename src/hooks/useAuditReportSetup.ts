import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AuditReportSetup {
  id: string;
  engagement_id: string;

  company_cin: string | null;
  registered_office: string | null;
  nature_of_business: string | null;

  is_standalone: boolean | null;
  accounting_framework: string | null;
  company_type: string | null;

  caro_applicable_status: string | null;
  caro_exclusion_reason: string | null;

  is_private_company: boolean | null;
  paid_up_capital: number | null;
  reserves_surplus: number | null;
  borrowings_amount: number | null;

  // Report configuration extensions
  cash_flow_required: boolean | null;
  has_branch_auditors: boolean | null;
  branch_locations: string | null;
  has_predecessor_auditor: boolean | null;
  predecessor_auditor_name: string | null;
  predecessor_report_date: string | null;
  ifc_applicable: boolean | null;
  is_listed_company: boolean | null;
  has_subsidiaries: boolean | null;
  caro_annexure_letter: string | null;
  ifc_annexure_letter: string | null;

  // Signing
  signing_partner_id: string | null;
  report_date: string | null;
  report_city: string | null;
  udin: string | null;

  setup_completed: boolean | null;
  report_status: string | null;

  locked: boolean | null;
  locked_at: string | null;
  locked_by: string | null;
  unlock_reason: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useAuditReportSetup(engagementId: string | undefined) {
  const [setup, setSetup] = useState<AuditReportSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSetup = async () => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_report_setup')
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();

      if (error) throw error;
      setSetup(data);
    } catch (error) {
      console.error('Error fetching audit report setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSetup = async (data: Partial<AuditReportSetup>) => {
    if (!engagementId || !user) return null;

    try {
      const { data: newSetup, error } = await supabase
        .from('audit_report_setup')
        .insert({
          engagement_id: engagementId,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      setSetup(newSetup);
      toast.success('Audit report setup created');
      return newSetup;
    } catch (error: any) {
      console.error('Error creating audit report setup:', error);
      toast.error(error.message || 'Failed to create setup');
      return null;
    }
  };

  const updateSetup = async (data: Partial<AuditReportSetup>) => {
    if (!setup) return null;

    try {
      const { data: updatedSetup, error } = await supabase
        .from('audit_report_setup')
        .update(data)
        .eq('id', setup.id)
        .select()
        .single();

      if (error) throw error;
      setSetup(updatedSetup);
      toast.success('Setup updated');
      return updatedSetup;
    } catch (error: any) {
      console.error('Error updating audit report setup:', error);
      toast.error(error.message || 'Failed to update setup');
      return null;
    }
  };

  const saveSetup = async (data: Partial<AuditReportSetup>) => {
    if (setup) {
      return updateSetup(data);
    } else {
      return createSetup(data);
    }
  };

  useEffect(() => {
    fetchSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  return {
    setup,
    loading,
    createSetup,
    updateSetup,
    saveSetup,
    refetch: fetchSetup,
  };
}

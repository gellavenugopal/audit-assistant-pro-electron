import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

export interface EngagementAssignment {
  id: string;
  engagement_id: string;
  user_id: string;
  role: string;
  assigned_by: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function useEngagementAssignments(engagementId?: string) {
  const [assignments, setAssignments] = useState<EngagementAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, role: currentUserRole } = useAuth();

  const canManageAssignments = currentUserRole === 'partner' || currentUserRole === 'manager';

  const fetchAssignments = async () => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await db
        .from('engagement_assignments')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: true })
        .execute();

      if (assignmentsError) throw assignmentsError;

      // Fetch user profiles for each assignment
      const userIds = assignmentsData?.map(a => a.user_id) || [];
      let profilesMap: Record<string, { full_name: string; email: string; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await db
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds)
          .execute();

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { full_name: string; email: string; avatar_url: string | null }>);
      }

      // Combine data
      const data = (assignmentsData || []).map(a => ({
        ...a,
        user: profilesMap[a.user_id] || undefined,
      }));

      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load team assignments');
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async (userId: string, role: string) => {
    if (!user || !engagementId || !canManageAssignments) {
      if (!canManageAssignments) {
        toast.error('You do not have permission to assign team members');
      }
      return false;
    }

    try {
      // Check if user is already assigned
      const existing = assignments.find(a => a.user_id === userId);
      if (existing) {
        toast.error('This team member is already assigned to this engagement');
        return false;
      }

      const { error } = await db
        .from('engagement_assignments')
        .insert({
          engagement_id: engagementId,
          user_id: userId,
          role,
          assigned_by: user.id,
        })
        .execute();

      if (error) throw error;

      toast.success('Team member assigned successfully');
      await fetchAssignments();
      return true;
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      toast.error(error.message || 'Failed to assign team member');
      return false;
    }
  };

  const updateAssignment = async (assignmentId: string, role: string) => {
    if (!canManageAssignments) {
      toast.error('You do not have permission to update assignments');
      return false;
    }

    try {
      const { error } = await db
        .from('engagement_assignments')
        .update({ role })
        .eq('id', assignmentId)
        .execute();

      if (error) throw error;

      toast.success('Assignment updated');
      await fetchAssignments();
      return true;
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast.error(error.message || 'Failed to update assignment');
      return false;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!canManageAssignments) {
      toast.error('You do not have permission to remove assignments');
      return false;
    }

    try {
      const { error } = await db
        .from('engagement_assignments')
        .delete()
        .eq('id', assignmentId)
        .execute();

      if (error) throw error;

      toast.success('Team member removed from engagement');
      await fetchAssignments();
      return true;
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error(error.message || 'Failed to remove assignment');
      return false;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [engagementId]);

  return {
    assignments,
    loading,
    canManageAssignments,
    addAssignment,
    updateAssignment,
    removeAssignment,
    refetch: fetchAssignments,
  };
}

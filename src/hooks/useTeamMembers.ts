import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
}

export function useTeamMembers() {
  const { user, role: currentUserRole } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageRoles = currentUserRole === 'partner' || currentUserRole === 'manager';

  const fetchMembers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const membersData: TeamMember[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'staff',
        };
      });

      // Sort by role hierarchy
      const roleOrder: Record<AppRole, number> = {
        partner: 1,
        manager: 2,
        senior: 3,
        staff: 4,
        viewer: 5,
      };

      membersData.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: AppRole) => {
    if (!canManageRoles) {
      toast.error('You do not have permission to change roles');
      return false;
    }

    // Prevent changing own role
    if (userId === user?.id) {
      toast.error('You cannot change your own role');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );

      toast.success('Role updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
      return false;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return {
    members,
    loading,
    canManageRoles,
    updateRole,
    refetch: fetchMembers,
  };
}

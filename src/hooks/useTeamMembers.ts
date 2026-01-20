import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = getSQLiteClient();

type AppRole = 'partner' | 'manager' | 'senior' | 'staff';

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
}

export function useTeamMembers(engagementId?: string) {
  const { user, role: currentUserRole } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageRoles = currentUserRole === 'partner' || currentUserRole === 'manager';

  const fetchMembers = async () => {
    try {
      let targetUserIds: string[] | null = null;

      if (engagementId) {
        const { data: assignments, error: assignmentsError } = await db
          .from('engagement_assignments')
          .select('user_id')
          .eq('engagement_id', engagementId)
          .execute();

        if (assignmentsError) throw assignmentsError;

        targetUserIds = (assignments || []).map(a => a.user_id);

        if (targetUserIds.length === 0) {
          setMembers([]);
          setLoading(false);
          return;
        }
      }

      // Fetch all profiles and roles, filter in JavaScript if needed
      const [{ data: allProfiles, error: profilesError }, { data: allRoles, error: rolesError }] = await Promise.all([
        db.from('profiles').select('user_id, full_name, email, avatar_url').execute(),
        db.from('user_roles').select('user_id, role').execute(),
      ]);
      
      // Filter by targetUserIds if specified
      const profiles = targetUserIds 
        ? (allProfiles || []).filter(p => targetUserIds.includes(p.user_id))
        : allProfiles;
      
      const roles = targetUserIds
        ? (allRoles || []).filter(r => targetUserIds.includes(r.user_id))
        : allRoles;

      if (rolesError) throw rolesError;
      if (profilesError) throw profilesError;

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
      const { error } = await db
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .execute();

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
  }, [engagementId]);

  return {
    members,
    loading,
    canManageRoles,
    updateRole,
    refetch: fetchMembers,
  };
}

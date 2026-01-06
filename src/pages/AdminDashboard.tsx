import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Briefcase, 
  ClipboardList, 
  AlertTriangle, 
  FileCheck,
  MessageSquare,
  Shield,
  Activity,
  Loader2,
  Trash2,
  UserPlus,
  Mail,
  History,
  UserCog,
  SendHorizontal,
  CalendarIcon,
  Filter,
  X,
  UserX,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithRole {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

interface SystemStats {
  totalUsers: number;
  totalEngagements: number;
  totalProcedures: number;
  totalRisks: number;
  totalEvidence: number;
  openReviewNotes: number;
}

const ROLES = ['partner', 'manager', 'senior', 'staff', 'viewer'] as const;

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'partner': return 'default';
    case 'manager': return 'secondary';
    case 'senior': return 'outline';
    default: return 'outline';
  }
};

export default function AdminDashboard() {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('staff');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [recentAdminLogs, setRecentAdminLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Drilldown state
  type ActiveCardType = 'overview' | 'users' | 'engagements' | 'procedures' | 'risks' | 'evidence' | 'notes';
  const [activeCard, setActiveCard] = useState<ActiveCardType>('overview');
  const [drilldownData, setDrilldownData] = useState<any[]>([]);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  // Helper function to log admin activity
  const logAdminActivity = async (
    action: string,
    entity: string,
    entityId: string | null,
    details: string,
    metadata?: Record<string, any>
  ) => {
    if (!currentUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUser.id)
        .single();

      await supabase.from('activity_logs').insert({
        user_id: currentUser.id,
        user_name: profile?.full_name || currentUser.email || 'Unknown',
        action,
        entity,
        entity_id: entityId,
        details,
        metadata: metadata || {},
      });

      // Refresh admin logs
      fetchAdminLogs();
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const fetchAdminLogs = async (
    filterAction?: string,
    filterDateFrom?: Date,
    filterDateTo?: Date
  ) => {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .in('entity', ['user', 'invitation'])
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply action filter
      const effectiveAction = filterAction ?? actionFilter;
      if (effectiveAction && effectiveAction !== 'all') {
        query = query.eq('action', effectiveAction);
      }

      // Apply date filters
      const effectiveDateFrom = filterDateFrom ?? dateFrom;
      const effectiveDateTo = filterDateTo ?? dateTo;
      
      if (effectiveDateFrom) {
        query = query.gte('created_at', effectiveDateFrom.toISOString());
      }
      if (effectiveDateTo) {
        // Set to end of day
        const endOfDay = new Date(effectiveDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (!error && data) {
        setRecentAdminLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin logs:', error);
    }
  };

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    fetchAdminLogs(value, dateFrom, dateTo);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    fetchAdminLogs(actionFilter, date, dateTo);
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    fetchAdminLogs(actionFilter, dateFrom, date);
  };

  const clearFilters = () => {
    setActionFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    fetchAdminLogs('all', undefined, undefined);
  };

  const hasActiveFilters = actionFilter !== 'all' || dateFrom || dateTo;

  useEffect(() => {
    fetchData();
    fetchAdminLogs();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with roles and is_active status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, is_active');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        is_active: profile.is_active ?? true,
        role: roles.find(r => r.user_id === profile.user_id)?.role || 'staff'
      }));

      setUsers(usersWithRoles);

      // Fetch system stats
      const [
        { count: engagementCount },
        { count: procedureCount },
        { count: riskCount },
        { count: evidenceCount },
        { count: openNotesCount }
      ] = await Promise.all([
        supabase.from('engagements').select('*', { count: 'exact', head: true }),
        supabase.from('audit_procedures').select('*', { count: 'exact', head: true }),
        supabase.from('risks').select('*', { count: 'exact', head: true }),
        supabase.from('evidence_files').select('*', { count: 'exact', head: true }),
        supabase.from('review_notes').select('*', { count: 'exact', head: true }).eq('status', 'open')
      ]);

      setStats({
        totalUsers: profiles.length,
        totalEngagements: engagementCount || 0,
        totalProcedures: procedureCount || 0,
        totalRisks: riskCount || 0,
        totalEvidence: evidenceCount || 0,
        openReviewNotes: openNotesCount || 0
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    const targetUser = users.find(u => u.user_id === userId);
    const oldRole = targetUser?.role;

    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'partner' | 'manager' | 'senior' | 'staff' | 'viewer' })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));

      // Log the role change
      await logAdminActivity(
        'role_changed',
        'user',
        userId,
        `Changed role for ${targetUser?.full_name} from ${oldRole} to ${newRole}`,
        { old_role: oldRole, new_role: newRole, target_email: targetUser?.email }
      );

      toast.success('Role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      // Delete from user_roles first (due to potential FK constraints)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      if (roleError) throw roleError;

      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', deletingUser.user_id);

      if (profileError) throw profileError;

      // Log the deletion
      await logAdminActivity(
        'user_deleted',
        'user',
        deletingUser.user_id,
        `Deleted user ${deletingUser.full_name} (${deletingUser.email})`,
        { deleted_email: deletingUser.email, deleted_role: deletingUser.role }
      );

      // Update local state
      setUsers(prev => prev.filter(u => u.user_id !== deletingUser.user_id));
      setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : null);
      
      toast.success(`User "${deletingUser.full_name}" has been removed`);
      setDeletingUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: UserWithRole) => {
    if (targetUser.user_id === currentUser?.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }

    const newStatus = !targetUser.is_active;
    const action = newStatus ? 'activate' : 'deactivate';

    setTogglingStatus(targetUser.user_id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', targetUser.user_id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === targetUser.user_id ? { ...u, is_active: newStatus } : u
      ));

      // Log the status change
      await logAdminActivity(
        newStatus ? 'user_activated' : 'user_deactivated',
        'user',
        targetUser.user_id,
        `${newStatus ? 'Activated' : 'Deactivated'} user ${targetUser.full_name}`,
        { target_email: targetUser.email, new_status: newStatus ? 'active' : 'deactivated' }
      );

      toast.success(`User ${targetUser.full_name} has been ${action}d`);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error(error.message || `Failed to ${action} user`);
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUser?.id)
        .single();

      const inviterName = profile?.full_name || 'Admin';
      const appUrl = window.location.origin;

      const { error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          inviterName,
          appUrl,
        },
      });

      if (error) throw error;

      // Log the invitation
      await logAdminActivity(
        'invitation_sent',
        'invitation',
        null,
        `Sent invitation to ${inviteEmail} with role ${inviteRole}`,
        { invited_email: inviteEmail, invited_role: inviteRole }
      );

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('staff');
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Drilldown fetch function
  const fetchDrilldownData = async (cardType: ActiveCardType) => {
    if (cardType === 'overview') {
      setDrilldownData([]);
      return;
    }

    setLoadingDrilldown(true);
    try {
      let data: any[] = [];
      
      switch (cardType) {
        case 'users':
          // Already have users in state
          data = users;
          break;
        case 'engagements':
          const { data: engagements } = await supabase
            .from('engagements')
            .select('id, name, client_name, financial_year, status')
            .order('created_at', { ascending: false })
            .limit(25);
          data = engagements || [];
          break;
        case 'procedures':
          const { data: procedures } = await supabase
            .from('standard_programs')
            .select('id, name, audit_area, engagement_type, is_active')
            .order('name')
            .limit(25);
          data = procedures || [];
          break;
        case 'risks':
          const { data: risks } = await supabase
            .from('risks')
            .select('id, risk_area, description, combined_risk, status')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(25);
          data = risks || [];
          break;
        case 'evidence':
          const { data: evidence } = await supabase
            .from('evidence_files')
            .select('id, name, file_type, file_size, created_at')
            .order('created_at', { ascending: false })
            .limit(25);
          data = evidence || [];
          break;
        case 'notes':
          const { data: notes } = await supabase
            .from('review_notes')
            .select('id, title, priority, status, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(25);
          data = notes || [];
          break;
      }
      
      setDrilldownData(data);
    } catch (error) {
      console.error('Error fetching drilldown data:', error);
      setDrilldownData([]);
    } finally {
      setLoadingDrilldown(false);
    }
  };

  const handleCardClick = (cardType: ActiveCardType) => {
    setActiveCard(cardType);
    fetchDrilldownData(cardType);
  };

  const statCards = [
    { key: 'users' as ActiveCardType, label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-primary' },
    { key: 'engagements' as ActiveCardType, label: 'Engagements', value: stats?.totalEngagements, icon: Briefcase, color: 'text-info' },
    { key: 'procedures' as ActiveCardType, label: 'Procedures', value: stats?.totalProcedures, icon: ClipboardList, color: 'text-success' },
    { key: 'risks' as ActiveCardType, label: 'Risks', value: stats?.totalRisks, icon: AlertTriangle, color: 'text-warning' },
    { key: 'evidence' as ActiveCardType, label: 'Evidence Files', value: stats?.totalEvidence, icon: FileCheck, color: 'text-primary' },
    { key: 'notes' as ActiveCardType, label: 'Open Notes', value: stats?.openReviewNotes, icon: MessageSquare, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and view system statistics</p>
        </div>
      </div>

      {/* System Stats - Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.key}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
              activeCard === stat.key && "ring-2 ring-primary border-primary"
            )}
            onClick={() => handleCardClick(stat.key)}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick(stat.key)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-8 w-12" /> : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Drilldown Section */}
      {activeCard !== 'overview' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="capitalize">{activeCard} Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setActiveCard('overview')}>
              <X className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </CardHeader>
          <CardContent>
            {loadingDrilldown ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : drilldownData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No data found</p>
            ) : (
              <div className="overflow-x-auto">
                {activeCard === 'users' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((user: any) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Deactivated'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeCard === 'engagements' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Engagement</TableHead>
                        <TableHead>FY</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((eng: any) => (
                        <TableRow key={eng.id}>
                          <TableCell className="font-medium">{eng.client_name}</TableCell>
                          <TableCell>{eng.name}</TableCell>
                          <TableCell>{eng.financial_year}</TableCell>
                          <TableCell><Badge variant="outline">{eng.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeCard === 'procedures' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program Name</TableHead>
                        <TableHead>Audit Area</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((proc: any) => (
                        <TableRow key={proc.id}>
                          <TableCell className="font-medium">{proc.name}</TableCell>
                          <TableCell>{proc.audit_area}</TableCell>
                          <TableCell>{proc.engagement_type}</TableCell>
                          <TableCell>
                            <Badge variant={proc.is_active ? 'default' : 'secondary'}>
                              {proc.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeCard === 'risks' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Risk Area</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((risk: any) => (
                        <TableRow key={risk.id}>
                          <TableCell className="font-medium">{risk.risk_area}</TableCell>
                          <TableCell className="max-w-xs truncate">{risk.description}</TableCell>
                          <TableCell>
                            <Badge variant={risk.combined_risk === 'high' ? 'destructive' : 'outline'}>
                              {risk.combined_risk}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline">{risk.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeCard === 'evidence' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((file: any) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell>{file.file_type}</TableCell>
                          <TableCell>{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                          <TableCell>{format(new Date(file.created_at), 'dd MMM yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {activeCard === 'notes' && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drilldownData.map((note: any) => (
                        <TableRow key={note.id}>
                          <TableCell className="font-medium">{note.title}</TableCell>
                          <TableCell>
                            <Badge variant={note.priority === 'high' ? 'destructive' : 'outline'}>
                              {note.priority}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline">{note.status}</Badge></TableCell>
                          <TableCell>{format(new Date(note.created_at), 'dd MMM yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              View and manage user roles. Only partners and managers can access this section.
            </CardDescription>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invite Team Member
                </DialogTitle>
                <DialogDescription>
                  Send an email invitation to a new team member. They'll receive a link to create their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This role will be mentioned in the invitation email.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={isSendingInvite}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvite} disabled={isSendingInvite}>
                  {isSendingInvite ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id} className={!user.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            user.is_active ? "bg-primary/20" : "bg-muted"
                          )}>
                            <span className={cn(
                              "text-xs font-medium",
                              user.is_active ? "text-primary" : "text-muted-foreground"
                            )}>
                              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                          {user.user_id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.is_active ? 'default' : 'destructive'}
                          className={user.is_active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                        >
                          {user.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {user.user_id === currentUser?.id ? (
                          <span className="text-xs text-muted-foreground">Cannot edit</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.role}
                              onValueChange={(value: string) => handleRoleChange(user.user_id, value)}
                              disabled={updatingRole === user.user_id || !user.is_active}
                            >
                              <SelectTrigger className="w-24 h-8">
                                {updatingRole === user.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8",
                                user.is_active 
                                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" 
                                  : "text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              )}
                              onClick={() => handleToggleUserStatus(user)}
                              disabled={togglingStatus === user.user_id}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {togglingStatus === user.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingUser(user)}
                              title="Delete user (permanent)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Admin Activity */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Admin Activity Log
              </CardTitle>
              <CardDescription>
                Latest admin actions including role changes, user deletions, and invitations.
              </CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="role_changed">Role Changed</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="invitation_sent">Invitation Sent</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] h-9 justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd MMM yy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={handleDateFromChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] h-9 justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd MMM yy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={handleDateToChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentAdminLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {hasActiveFilters ? 'No activity matches your filters' : 'No recent admin activity'}
            </p>
          ) : (
            <div className="space-y-3">
              {recentAdminLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    log.action === 'role_changed' ? 'bg-primary/10 text-primary' :
                    log.action === 'user_deleted' ? 'bg-destructive/10 text-destructive' :
                    'bg-info/10 text-info'
                  }`}>
                    {log.action === 'role_changed' && <UserCog className="h-4 w-4" />}
                    {log.action === 'user_deleted' && <Trash2 className="h-4 w-4" />}
                    {log.action === 'invitation_sent' && <SendHorizontal className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{log.details}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">by {log.user_name}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => { fetchData(); fetchAdminLogs(); }}>
              Refresh Data
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/audit-trail'}>
              View Audit Trail
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/settings'}>
              System Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.full_name}</strong> ({deletingUser?.email})? 
              This action cannot be undone and will remove their profile and role from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

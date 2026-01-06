import { useState } from 'react';
import { useEngagementAssignments } from '@/hooks/useEngagementAssignments';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamAssignmentDialogProps {
  engagementId: string;
  engagementName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ENGAGEMENT_ROLES = [
  { value: 'partner', label: 'Partner' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'reviewer', label: 'Reviewer' },
];

export function TeamAssignmentDialog({
  engagementId,
  engagementName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TeamAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('staff');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { members, loading: loadingMembers } = useTeamMembers();
  const {
    assignments,
    loading: loadingAssignments,
    canManageAssignments,
    addAssignment,
    removeAssignment,
  } = useEngagementAssignments(engagementId);

  const assignedUserIds = assignments.map((a) => a.user_id);
  const availableMembers = members.filter((m) => !assignedUserIds.includes(m.user_id));

  const handleAdd = async () => {
    if (!selectedUserId || !selectedRole) return;
    setAdding(true);
    const success = await addAssignment(selectedUserId, selectedRole);
    if (success) {
      setSelectedUserId('');
      setSelectedRole('staff');
    }
    setAdding(false);
  };

  const handleRemove = async (assignmentId: string) => {
    setRemovingId(assignmentId);
    await removeAssignment(assignmentId);
    setRemovingId(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'partner':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'senior':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Team Assignments</DialogTitle>
          <DialogDescription>
            Manage team members assigned to {engagementName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new assignment */}
          {canManageAssignments && (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {loadingMembers ? (
                    <div className="p-2">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : availableMembers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      All team members are already assigned
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <span>{member.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="icon"
                onClick={handleAdd}
                disabled={!selectedUserId || adding}
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Current assignments */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Assigned Team ({assignments.length})
            </h4>
            
            {loadingAssignments ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignment.user?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(assignment.user?.full_name || 'UN')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {assignment.user?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(assignment.role)}>
                        {assignment.role}
                      </Badge>
                      {canManageAssignments && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(assignment.id)}
                          disabled={removingId === assignment.id}
                        >
                          {removingId === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  FileCheck, 
  CheckCircle2, 
  FilePenLine,
  Lock,
  Unlock,
  Edit2,
  Trash2
} from 'lucide-react';

type ApprovalStage = 'draft' | 'prepared' | 'reviewed' | 'approved';

interface ApprovalActionsProps {
  stage: ApprovalStage;
  locked: boolean;
  canPrepare?: boolean;
  canReview?: boolean;
  canApprove?: boolean;
  canUnlock?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onMarkPrepared?: () => void;
  onMarkReviewed?: () => void;
  onApprove?: () => void;
  onUnlock?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ApprovalActions({
  stage,
  locked,
  canPrepare = true,
  canReview = false,
  canApprove = false,
  canUnlock = false,
  canEdit = true,
  canDelete = false,
  onMarkPrepared,
  onMarkReviewed,
  onApprove,
  onUnlock,
  onEdit,
  onDelete,
}: ApprovalActionsProps) {
  const showPrepare = stage === 'draft' && canPrepare && onMarkPrepared;
  const showReview = stage === 'prepared' && canReview && onMarkReviewed;
  const showApprove = stage === 'reviewed' && canApprove && onApprove;
  const showUnlock = locked && canUnlock && onUnlock;
  const showEdit = !locked && canEdit && onEdit;
  const showDelete = canDelete && onDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showPrepare && (
          <DropdownMenuItem onClick={onMarkPrepared} className="gap-2">
            <FilePenLine className="h-4 w-4" />
            Mark Prepared
          </DropdownMenuItem>
        )}
        {showReview && (
          <DropdownMenuItem onClick={onMarkReviewed} className="gap-2">
            <FileCheck className="h-4 w-4" />
            Mark Reviewed
          </DropdownMenuItem>
        )}
        {showApprove && (
          <DropdownMenuItem onClick={onApprove} className="gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Approve
          </DropdownMenuItem>
        )}
        {showUnlock && (
          <DropdownMenuItem onClick={onUnlock} className="gap-2">
            <Unlock className="h-4 w-4 text-warning" />
            Unlock
          </DropdownMenuItem>
        )}
        
        {(showPrepare || showReview || showApprove || showUnlock) && (showEdit || showDelete) && (
          <DropdownMenuSeparator />
        )}
        
        {showEdit && (
          <DropdownMenuItem onClick={onEdit} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {showDelete && (
          <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}

        {locked && !showUnlock && (
          <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            Locked (Approved)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
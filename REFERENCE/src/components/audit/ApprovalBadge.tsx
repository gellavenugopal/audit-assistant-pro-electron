import { StatusBadge } from '@/components/ui/status-badge';
import { Lock, Unlock, CheckCircle2, FileCheck, FilePenLine, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type ApprovalStage = 'draft' | 'prepared' | 'reviewed' | 'approved';

interface ApprovalBadgeProps {
  stage: ApprovalStage;
  locked?: boolean;
  className?: string;
}

const stageConfig = {
  draft: {
    label: 'Draft',
    variant: 'default' as const,
    icon: FileText,
  },
  prepared: {
    label: 'Prepared',
    variant: 'info' as const,
    icon: FilePenLine,
  },
  reviewed: {
    label: 'Reviewed',
    variant: 'purple' as const,
    icon: FileCheck,
  },
  approved: {
    label: 'Approved',
    variant: 'success' as const,
    icon: CheckCircle2,
  },
};

export function ApprovalBadge({ stage, locked, className }: ApprovalBadgeProps) {
  const config = stageConfig[stage] || stageConfig.draft;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <StatusBadge variant={config.variant} dot={false}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </StatusBadge>
      {locked && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          <Lock className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export function getApprovalStageLabel(stage: ApprovalStage): string {
  return stageConfig[stage]?.label || 'Draft';
}
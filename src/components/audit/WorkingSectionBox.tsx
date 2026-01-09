import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDown,
  ArrowUp,
  Lock,
  Paperclip,
  MessageSquare,
  Save,
  Trash2,
  Unlock,
  Edit2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditExecutionBox, BoxStatus } from '@/types/auditExecution';
import { StatusBadge, getStatusVariant } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface WorkingSectionBoxProps {
  box: (AuditExecutionBox & { comment_count?: number }) | undefined;
  onUpdate: (boxId: string, updates: Partial<AuditExecutionBox>) => void;
  onDelete: (boxId: string) => void;
  onAttach: () => void;
  onStatusChange: (boxId: string, status: BoxStatus) => void;
  onToggleLock: (boxId: string) => void;
  onCommentClick: (boxId: string) => void;
  attachmentCount?: number;
  onMoveUp?: (boxId: string) => void;
  onMoveDown?: (boxId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const STATUS_OPTIONS: { value: BoxStatus; label: string }[] = [
  { value: 'not-commenced', label: 'Not Commenced' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'complete', label: 'Complete' },
];

export function WorkingSectionBoxComponent({
  box,
  onUpdate,
  onDelete,
  onAttach,
  onStatusChange,
  onToggleLock,
  onCommentClick,
  attachmentCount = 0,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: WorkingSectionBoxProps) {
  const [header, setHeader] = useState(box?.header || '');
  const [content, setContent] = useState(box?.content || '');
  const [editingHeader, setEditingHeader] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setHeader(box?.header || '');
    setContent(box?.content || '');
    setDirty(false);
    setEditingHeader(false);
  }, [box?.id, box?.header, box?.content]);

  if (!box) {
    return null;
  }

  const handleSave = () => {
    if (box.locked) return;
    const trimmedHeader = header.trim();
    onUpdate(box.id, {
      header: trimmedHeader || box.header,
      content,
    });
    setDirty(false);
    setEditingHeader(false);
  };

  return (
    <Card className={cn('border', box.locked && 'opacity-70')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {editingHeader ? (
              <Input
                value={header}
                onChange={(e) => {
                  setHeader(e.target.value);
                  setDirty(true);
                }}
                onBlur={() => setEditingHeader(false)}
                disabled={box.locked}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{box.header}</h4>
                {!box.locked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingHeader(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {box.locked && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <StatusBadge variant={getStatusVariant(box.status)} dot={false}>
                {STATUS_OPTIONS.find((s) => s.value === box.status)?.label || box.status}
              </StatusBadge>
              {attachmentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachmentCount}
                </Badge>
              )}
              {box.comment_count && box.comment_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {box.comment_count}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={box.status}
              onValueChange={(value) => onStatusChange(box.id, value as BoxStatus)}
              disabled={box.locked}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleLock(box.id)}
            >
              {box.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <Textarea
          value={content || ''}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          placeholder="Document procedures, results, and conclusions..."
          className="min-h-[120px] text-sm"
          disabled={box.locked}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMoveUp(box.id)}
                disabled={isFirst || box.locked}
                title="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMoveDown(box.id)}
                disabled={isLast || box.locked}
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAttach}>
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCommentClick(box.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
            {!box.locked && (
              <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            {!box.locked && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(box.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

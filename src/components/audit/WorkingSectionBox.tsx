import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
  X,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditExecutionBox, BoxStatus, LEGACY_BOX_HEADER_MAP } from '@/types/auditExecution';
import { cn } from '@/lib/utils';

interface WorkingSectionBoxProps {
  box: (AuditExecutionBox & { comment_count?: number }) | undefined;
  onUpdate: (boxId: string, updates: Partial<AuditExecutionBox>) => void;
  onDelete: (boxId: string) => void;
  onAttach: () => void;
  onUploadFiles?: (files: FileList | null) => void;
  onStatusChange: (boxId: string, status: BoxStatus) => void;
  onToggleLock: (boxId: string) => void;
  onCommentClick: (boxId: string) => void;
  onExport?: (format: 'excel' | 'word') => void;
  attachmentCount?: number;
  onMoveUp?: (boxId: string) => void;
  onMoveDown?: (boxId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const STATUS_META: Record<
  BoxStatus,
  { label: string; triggerClass: string; dotClass: string; itemClass: string }
> = {
  'not-commenced': {
    label: 'Not Commenced',
    triggerClass: 'border-slate-200 bg-slate-50 text-slate-700',
    dotClass: 'bg-slate-400',
    itemClass:
      'text-slate-700 focus:bg-slate-100 focus:text-slate-800 data-[state=checked]:bg-slate-100 data-[state=checked]:text-slate-800',
  },
  'in-progress': {
    label: 'In Progress',
    triggerClass: 'border-amber-200 bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-500',
    itemClass:
      'text-amber-700 focus:bg-amber-50 focus:text-amber-800 data-[state=checked]:bg-amber-50 data-[state=checked]:text-amber-800',
  },
  review: {
    label: 'Under Review',
    triggerClass: 'border-blue-200 bg-blue-50 text-blue-800',
    dotClass: 'bg-blue-500',
    itemClass:
      'text-blue-700 focus:bg-blue-50 focus:text-blue-800 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-800',
  },
  complete: {
    label: 'Complete',
    triggerClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-500',
    itemClass:
      'text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-800',
  },
};

const STATUS_OPTIONS: { value: BoxStatus; label: string }[] = (
  Object.keys(STATUS_META) as BoxStatus[]
).map((value) => ({ value, label: STATUS_META[value].label }));

const isValidStatus = (value: unknown): value is BoxStatus =>
  (Object.keys(STATUS_META) as BoxStatus[]).includes(value as BoxStatus);

const normalizeHeader = (value: string) =>
  LEGACY_BOX_HEADER_MAP[value.trim()] ?? value.trim();
const normalizeContent = (value: AuditExecutionBox['content'], status: BoxStatus) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.trim() === '0' && status === 'not-commenced') return '';
  return text;
};

export function WorkingSectionBoxComponent({
  box,
  onUpdate,
  onDelete,
  onAttach,
  onUploadFiles,
  onStatusChange,
  onToggleLock,
  onCommentClick,
  onExport,
  attachmentCount = 0,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: WorkingSectionBoxProps) {
  const [header, setHeader] = useState(normalizeHeader(box?.header || ''));
  const [content, setContent] = useState(
    normalizeContent(box?.content, box?.status ?? 'not-commenced')
  );
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerDirty, setHeaderDirty] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const isLocked = box?.locked === true || String(box?.locked) === 'true';
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeader(normalizeHeader(box?.header || ''));
    setContent(normalizeContent(box?.content, box?.status ?? 'not-commenced'));
    setHeaderDirty(false);
    setContentDirty(false);
    setEditingHeader(false);
  }, [box?.id, box?.header, box?.content, box?.status]);

  useEffect(() => {
    if (!box || isLocked) return;
    if (!isValidStatus(box.status)) {
      onStatusChange(box.id, 'not-commenced');
    }
  }, [box?.id, isLocked, box?.status, onStatusChange]);

  if (!box) {
    return null;
  }

  const normalizedStatus = isValidStatus(box.status) ? box.status : 'not-commenced';
  const statusMeta = STATUS_META[normalizedStatus];

  const handleSave = () => {
    if (isLocked) return;
    const trimmedHeader = header.trim();
    onUpdate(box.id, {
      header: trimmedHeader || box.header,
      content,
    });
    setHeaderDirty(false);
    setContentDirty(false);
    setEditingHeader(false);
  };

  const handleHeaderSave = () => {
    if (isLocked) return;
    const trimmedHeader = header.trim();
    if (!trimmedHeader) {
      setHeader(normalizeHeader(box.header));
      setHeaderDirty(false);
      setEditingHeader(false);
      return;
    }
    onUpdate(box.id, { header: trimmedHeader });
    setHeaderDirty(false);
    setEditingHeader(false);
  };

  const handleHeaderCancel = () => {
    setHeader(normalizeHeader(box.header));
    setHeaderDirty(false);
    setEditingHeader(false);
  };

  return (
    <Card className={cn('border', isLocked && 'opacity-70')}>
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {editingHeader ? (
              <div className="flex items-center gap-2">
                <Input
                  value={header}
                  onChange={(e) => {
                    setHeader(e.target.value);
                    setHeaderDirty(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleHeaderSave();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      handleHeaderCancel();
                    }
                  }}
                  disabled={isLocked}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleHeaderSave}
                  disabled={!headerDirty}
                  title="Save header"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleHeaderCancel}
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {normalizeHeader(box.header)}
                </h4>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingHeader(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isLocked && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {attachmentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachmentCount}
                </Badge>
              )}
              {(box.comment_count ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {box.comment_count}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={normalizedStatus}
              onValueChange={(value) => onStatusChange(box.id, value as BoxStatus)}
              disabled={isLocked}
            >
              <SelectTrigger
                className={cn('h-8 w-[160px] text-xs', statusMeta.triggerClass)}
              >
                <span className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', statusMeta.dotClass)} />
                  <SelectValue placeholder="Status" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={STATUS_META[option.value].itemClass}
                  >
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
              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        <RichTextEditor
          value={content || ''}
          onChange={(value) => {
            setContent(value);
            setContentDirty(true);
          }}
          placeholder="Enter text"
          disabled={isLocked}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onMoveUp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMoveUp(box.id)}
                disabled={isFirst || isLocked}
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
                disabled={isLast || isLocked}
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onUploadFiles ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onAttach}>
                    Attach from Vault
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => uploadInputRef.current?.click()}>
                    Upload File
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={onAttach}>
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>
            )}
            <input
              ref={uploadInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              multiple
              className="hidden"
              onChange={(event) => {
                onUploadFiles?.(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => onCommentClick(box.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
            {onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExport('word')}>
                    Export Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('excel')}>
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!headerDirty && !contentDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            {!isLocked && (
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

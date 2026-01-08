import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Edit2, Trash2, Save, X, Paperclip, Lock, Unlock, MessageSquare, Bold, Italic, ListOrdered, Strikethrough, Link2, Undo, Redo, List, ChevronUp, ChevronDown } from 'lucide-react';
import { WorkingSectionBox, BoxStatus } from '@/types/auditProgramNew';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorkingSectionBoxProps {
  box: WorkingSectionBox;
  onUpdate: (boxId: string, header: string, content: string) => Promise<void>;
  onDelete: (boxId: string) => Promise<void>;
  onAttach?: (boxId: string) => void;
  onStatusChange?: (boxId: string, status: BoxStatus) => void;
  onToggleLock?: (boxId: string) => void;
  onCommentClick?: (boxId: string) => void;
  attachmentCount?: number;
  onMoveUp?: (boxId: string) => void;
  onMoveDown?: (boxId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

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
  isFirst = false,
  isLast = false,
}: WorkingSectionBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedHeader, setEditedHeader] = useState(box.header);
  const [editedContent, setEditedContent] = useState(box.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const getStatusBadge = (status: BoxStatus) => {
    const config = {
      'not-commenced': { label: 'Not Commenced', variant: 'secondary' as const, className: 'bg-gray-200 text-gray-700' },
      'in-progress': { label: 'In Progress', variant: 'default' as const, className: 'bg-yellow-200 text-yellow-800' },
      'review': { label: 'Review', variant: 'default' as const, className: 'bg-blue-200 text-blue-800' },
      'complete': { label: 'Complete', variant: 'default' as const, className: 'bg-green-200 text-green-800' },
    };
    const { label, className } = config[status];
    return <Badge className={className}>{label}</Badge>;
  };

  useEffect(() => {
    if (!isEditing) {
      setEditedHeader(box.header);
      setEditedContent(box.content);
    }
  }, [box.id, box.header, box.content, isEditing]);

  useEffect(() => {
    // Sync contentEditable div with editedContent when entering edit mode
    if (isEditing && editorRef.current && editorRef.current.innerHTML !== editedContent) {
      editorRef.current.innerHTML = cleanContent(editedContent);
    }
  }, [isEditing, editedContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const content = cleanContent(editorRef.current?.innerHTML || editedContent);
      await onUpdate(box.id, editedHeader, content);
      toast.success('✨ Demo: Content saved!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving box:', error);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedHeader(box.header);
    setEditedContent(box.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = cleanContent(box.content);
    }
    setIsEditing(false);
  };

  const applyFormatting = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
  };

  const insertCustomList = (listType: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    const listHTML = `<ol style="list-style-type: ${listType}; margin-left: 20px; padding-left: 20px;"><li></li></ol>`;
    document.execCommand('insertHTML', false, listHTML);
    
    // Move cursor inside the list item
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && editorRef.current) {
        const range = document.createRange();
        const listItem = editorRef.current.querySelector('ol li:last-child');
        if (listItem) {
          range.setStart(listItem, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 10);
  };

  const insertLink = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    const url = prompt('Enter URL:', 'https://');
    if (!url) return;
    
    editorRef.current.focus();
    
    if (selectedText) {
      // If text is selected, convert it to a link
      document.execCommand('createLink', false, url);
    } else {
      // If no text selected, ask for link text
      const linkText = prompt('Enter link text:', 'Click here');
      if (linkText) {
        const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>&nbsp;`;
        document.execCommand('insertHTML', false, linkHTML);
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setEditedContent(editorRef.current.innerHTML);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(box.id);
      setShowDeleteDialog(false);
      toast.success('Box deleted successfully');
    } catch (error) {
      console.error('Error deleting box:', error);
    }
  };

  // Clean content to remove literal \n characters and actual newlines
  const cleanContent = (content: string) => {
    if (!content) return content;
    return content
      .replace(/^(\s|\\n|<br>|<br\/>)+/gi, '') // Remove whitespace/\n/br at the start
      .replace(/(\s|\\n|<br>|<br\/>)+$/gi, '') // Remove at the end
      .replace(/\\n/g, '<br>') // Convert literal \n to br
      .trim(); // Final trim
  };

  return (
    <>
      <Card className={cn("mb-2 border-l-4", box.locked ? "border-l-gray-400" : "border-l-primary/30")}>
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {getStatusBadge(box.status)}
              {box.locked && (
                <Badge variant="outline" className="text-gray-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
              {box.comment_count > 0 && (
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => onCommentClick?.(box.id)}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {box.comment_count}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {onStatusChange && !box.locked && (
                <Select value={box.status} onValueChange={(val) => onStatusChange(box.id, val as BoxStatus)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-commenced">Not Commenced</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {onToggleLock && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleLock(box.id)}
                  title={box.locked ? "Unlock box" : "Lock box"}
                >
                  {box.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              )}
              {/* Move Up/Down Buttons */}
              {!box.locked && (onMoveUp || onMoveDown) && (
                <div className="flex gap-0.5 border rounded-md">
                  {onMoveUp && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMoveUp(box.id)}
                      disabled={isFirst}
                      title="Move box up"
                      className="h-7 w-7 p-0 rounded-r-none border-r"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  )}
                  {onMoveDown && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMoveDown(box.id)}
                      disabled={isLast}
                      title="Move box down"
                      className="h-7 w-7 p-0 rounded-l-none"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input
                value={editedHeader}
                onChange={(e) => setEditedHeader(e.target.value)}
                className="font-semibold text-sm h-7"
                placeholder="Header name"
              />
            ) : (
              <h4 className="font-semibold text-sm text-foreground">{box.header}</h4>
            )}
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-7 w-7 p-0"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  {onAttach && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAttach(box.id)}
                      className="relative h-7 w-7 p-0"
                      disabled={box.locked}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {attachmentCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {attachmentCount}
                        </span>
                      )}
                    </Button>
                  )}
                  {onCommentClick && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCommentClick(box.id)}
                      className="relative h-7 w-7 p-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    disabled={box.locked}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    disabled={box.locked}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-3">
          {isEditing ? (
            <div className="space-y-1">
              {/* Rich Text Toolbar */}
              <div className="flex gap-0.5 pb-1 border-b bg-gradient-to-r from-gray-50 to-blue-50 p-1.5 rounded-t-md flex-wrap">
                <div className="flex gap-0.5 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }}
                    title="Bold (Ctrl+B)"
                    className="h-6 w-6 p-0"
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }}
                    title="Italic (Ctrl+I)"
                    className="h-6 w-6 p-0"
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onMouseDown={(e) => { e.preventDefault(); applyFormatting('strikeThrough'); }}
                    title="Strikethrough"
                    className="h-6 w-6 p-0"
                  >
                    <Strikethrough className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }}
                    title="Underline (Ctrl+U)"
                    className="h-6 w-6 p-0"
                  >
                    <span className="font-bold underline text-xs">U</span>
                  </Button>
                </div>

                <div className="w-px bg-gray-300 mx-1 ml-auto" />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onMouseDown={(e) => { e.preventDefault(); applyFormatting('undo'); }}
                  title="Undo (Ctrl+Z)"
                  className="h-6 w-6 p-0"
                >
                  <Undo className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onMouseDown={(e) => { e.preventDefault(); applyFormatting('redo'); }}
                  title="Redo (Ctrl+Y)"
                  className="h-6 w-6 p-0"
                >
                  <Redo className="h-3 w-3" />
                </Button>
              </div>

              {/* WYSIWYG Editor */}
              <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleInput}
                className="min-h-[80px] max-h-[250px] overflow-y-auto p-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm leading-snug"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
                suppressContentEditableWarning
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Click formatting buttons above to style your text.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "min-h-[60px] max-h-[200px] overflow-auto p-2 rounded-md border bg-muted/30 cursor-text text-sm leading-snug",
                !box.content && "flex items-center justify-center"
              )}
              onClick={() => {
                if (!box.locked) setIsEditing(true);
              }}
            >
              {box.content ? (
                <div 
                  className="prose prose-sm max-w-none text-sm leading-snug"
                  dangerouslySetInnerHTML={{ __html: cleanContent(box.content) }}
                />
              ) : (
                <span className="text-muted-foreground italic text-xs">Click here to add content...</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Box</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the box "{box.header}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, AlertTriangle, Eye, CheckSquare, FileText, Loader2 } from 'lucide-react';
import { ProcedureTemplate } from '@/hooks/useProcedureTemplates';
import { useTemplateWorkpaper } from '@/hooks/useWorkingPaper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface ProcedureTemplateCardProps {
  template: ProcedureTemplate;
  programName?: string;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
  onPreview: () => void;
  usageCount?: number;
}

export function ProcedureTemplateCard({
  template,
  programName,
  onEdit,
  onDelete,
  onPreview,
  usageCount = 0,
}: ProcedureTemplateCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const checklistCount = template.checklist_items?.length || 0;
  const evidenceCount = template.evidence_requirements?.length || 0;

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    const success = await onDelete();
    setIsDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setConfirmText('');
    }
  };

  const isInUse = usageCount > 0;

  return (
    <>
      <div className="p-3 rounded-lg border bg-muted/30 group hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{template.procedure_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{template.area}</Badge>
              {template.assertion && (
                <Badge variant="secondary" className="text-xs">{template.assertion}</Badge>
              )}
              {programName && (
                <span className="text-xs text-muted-foreground truncate">
                  {programName}
                </span>
              )}
              {template.is_standalone && (
                <Badge variant="secondary" className="text-xs">Standalone</Badge>
              )}
            </div>
            
            {/* Workpaper counts */}
            <div className="flex items-center gap-3 mt-2">
              {checklistCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckSquare className="h-3 w-3" />
                        <span>Checklist: {checklistCount}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{checklistCount} checklist item(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {evidenceCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>Evidence: {evidenceCount}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{evidenceCount} evidence requirement(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onPreview}
              title="Preview template"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
              title="Edit template"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete template"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Procedure Template
            </DialogTitle>
            <DialogDescription>
              {isInUse ? (
                <span className="text-destructive">
                  This template is in use by {usageCount} procedure(s). Remove it from those procedures first before deleting.
                </span>
              ) : (
                <>Are you sure you want to delete "{template.procedure_name}"? This action cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {isInUse ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Template is in use ({usageCount} references). Cannot delete.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="max-w-xs"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            {!isInUse && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Template'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Preview Dialog Component
interface ProcedureTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProcedureTemplate | null;
}

export function ProcedureTemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: ProcedureTemplatePreviewDialogProps) {
  // Use the relational hook to fetch actual checklist/evidence items
  const {
    checklistItems,
    evidenceRequirements,
    loading,
  } = useTemplateWorkpaper(open && template ? template.id : null);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Template Preview
          </DialogTitle>
          <DialogDescription>
            {template.procedure_name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium mb-2">Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Area:</div>
                <div>{template.area}</div>
                {template.assertion && (
                  <>
                    <div className="text-muted-foreground">Assertion:</div>
                    <div className="capitalize">{template.assertion}</div>
                  </>
                )}
                {template.default_status && (
                  <>
                    <div className="text-muted-foreground">Default Status:</div>
                    <div className="capitalize">{template.default_status.replace('_', ' ')}</div>
                  </>
                )}
              </div>
            </div>

            {/* Description/Objective */}
            {template.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Objective / Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {template.description}
                </p>
              </div>
            )}

            {/* Checklist */}
            <div>
              <h4 className="text-sm font-medium mb-2">Checklist ({checklistItems.length} items)</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : checklistItems.length > 0 ? (
                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <span className="flex-1">{item.text}</span>
                      {item.is_required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist items</p>
              )}
            </div>

            {/* Evidence Requirements */}
            <div>
              <h4 className="text-sm font-medium mb-2">Evidence Required ({evidenceRequirements.length} items)</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : evidenceRequirements.length > 0 ? (
                <div className="space-y-2">
                  {evidenceRequirements.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex-1">
                        <span>{item.title}</span>
                        {item.wp_ref && (
                          <span className="text-muted-foreground ml-2">
                            (WP Ref: {item.wp_ref})
                          </span>
                        )}
                        {item.allowed_file_types && item.allowed_file_types.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.allowed_file_types.map(type => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.is_required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No evidence requirements</p>
              )}
            </div>

            {/* Conclusion Prompt */}
            {template.conclusion_prompt && (
              <div>
                <h4 className="text-sm font-medium mb-2">Conclusion Prompt</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {template.conclusion_prompt}
                </p>
              </div>
            )}

            {/* Disclaimer Note */}
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground italic">
                Templates are illustrative; tailor per engagement using professional judgement.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

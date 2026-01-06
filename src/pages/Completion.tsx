import { useState } from 'react';
import { sampleCompletionChecklist } from '@/data/sampleData';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Unlock, AlertTriangle, CheckCircle, FileOutput, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Completion() {
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);

  // Group checklist items by category
  const categories = [...new Set(sampleCompletionChecklist.map((item) => item.category))];
  const groupedItems = categories.map((category) => ({
    category,
    items: sampleCompletionChecklist.filter((item) => item.category === category),
  }));

  const totalItems = sampleCompletionChecklist.filter((item) => item.status !== 'na').length;
  const completedItems = sampleCompletionChecklist.filter((item) => item.status === 'complete').length;
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

  const allComplete = completedItems === totalItems;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Completion & Sign-off</h1>
          <p className="text-muted-foreground mt-1">
            Complete checklist and lock the audit file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <FileOutput className="h-4 w-4" />
            Export Audit File
          </Button>
          <Button
            className="gap-2"
            disabled={!allComplete}
            onClick={() => setIsLockDialogOpen(true)}
          >
            <Lock className="h-4 w-4" />
            Lock File
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="audit-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Completion Progress</h2>
          <span className="text-2xl font-bold text-primary">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-3" />
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {completedItems} of {totalItems} items complete
          </span>
          {allComplete ? (
            <StatusBadge variant="success">Ready to Lock</StatusBadge>
          ) : (
            <StatusBadge variant="warning">
              {totalItems - completedItems} items remaining
            </StatusBadge>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completedItems}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/10">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {sampleCompletionChecklist.filter((item) => item.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {sampleCompletionChecklist.filter((item) => item.status === 'na').length}
            </p>
            <p className="text-sm text-muted-foreground">Not Applicable</p>
          </div>
        </div>
      </div>

      {/* Checklist Accordion */}
      <Accordion type="multiple" defaultValue={categories} className="space-y-4">
        {groupedItems.map((group) => {
          const groupComplete = group.items.filter((i) => i.status === 'complete').length;
          const groupTotal = group.items.filter((i) => i.status !== 'na').length;

          return (
            <AccordionItem
              key={group.category}
              value={group.category}
              className="audit-card border-none"
            >
              <AccordionTrigger className="hover:no-underline py-4 px-0">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-foreground">{group.category}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {groupComplete}/{groupTotal} items complete
                    </p>
                  </div>
                  <div className="w-24 mr-4">
                    <Progress
                      value={groupTotal > 0 ? (groupComplete / groupTotal) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 border-t border-border mt-4 space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <Checkbox
                        checked={item.status === 'complete'}
                        disabled={item.status === 'na'}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{item.item}</p>
                        {item.status === 'complete' && item.completedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Completed by {item.completedBy}
                            {item.completedAt &&
                              ` on ${format(new Date(item.completedAt), 'dd MMM yyyy')}`}
                          </p>
                        )}
                        {item.status === 'na' && (
                          <p className="text-xs text-muted-foreground mt-1">Not applicable</p>
                        )}
                      </div>
                      {item.status === 'complete' ? (
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      ) : item.status === 'na' ? (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      ) : (
                        <span className="text-xs text-warning">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Lock Confirmation Dialog */}
      <Dialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Lock Audit File
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to lock this audit file? This action will:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Prevent any further edits to procedures, evidence, and notes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Mark the engagement as completed</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Generate the final audit file pack for inspection</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Unlocking will require Partner approval and will be logged in the audit trail.
                </span>
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsLockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsLockDialogOpen(false)} className="gap-2">
              <Lock className="h-4 w-4" />
              Confirm Lock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

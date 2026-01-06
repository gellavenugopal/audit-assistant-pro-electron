import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, CheckSquare, FileText, Eye, Info } from 'lucide-react';
import { ProcedureTemplate, ProcedureTemplateFormData } from '@/hooks/useProcedureTemplates';
import { useTemplateWorkpaper, TemplateChecklistItem, TemplateEvidenceRequirement } from '@/hooks/useWorkingPaper';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const AUDIT_AREAS = [
  'Revenue', 'Purchases', 'Payroll', 'Fixed Assets', 'Inventory', 
  'Cash & Bank', 'Receivables', 'Payables', 'Equity', 'Investments',
  'Loans & Borrowings', 'Related Parties', 'Provisions', 'Tax', 'General', 'Other'
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
];

const ALLOWED_FILE_TYPES = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'csv'];

interface StandardProgram {
  id: string;
  name: string;
}

interface ProcedureTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ProcedureTemplate | null;
  programs: StandardProgram[];
  onSave: (data: ProcedureTemplateFormData) => Promise<string | null>; // Returns template ID on success, null on failure
}

export function ProcedureTemplateDialog({
  open,
  onOpenChange,
  template,
  programs,
  onSave,
}: ProcedureTemplateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form state for basic template details
  const [form, setForm] = useState<ProcedureTemplateFormData>({
    procedure_name: '',
    description: null,
    area: '',
    assertion: null,
    program_id: null,
    conclusion_prompt: null,
    default_status: null,
  });

  // Use the new relational hook for checklist/evidence
  const {
    checklistItems: savedChecklistItems,
    evidenceRequirements: savedEvidenceRequirements,
    loading: loadingWorkpaper,
    addChecklistItem,
    deleteChecklistItem,
    addEvidenceRequirement,
    deleteEvidenceRequirement,
    refetch: refetchWorkpaper,
  } = useTemplateWorkpaper(template?.id || null);

  // Local state for new items being added
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistRequired, setNewChecklistRequired] = useState(true);
  const [newEvidenceLabel, setNewEvidenceLabel] = useState('');
  const [newEvidenceRequired, setNewEvidenceRequired] = useState(true);
  const [newEvidenceTypes, setNewEvidenceTypes] = useState<string[]>([]);
  const [newEvidenceWpRef, setNewEvidenceWpRef] = useState('');
  
  // Pending items for new templates (not yet saved)
  const [pendingChecklistItems, setPendingChecklistItems] = useState<{text: string; isRequired: boolean}[]>([]);
  const [pendingEvidenceItems, setPendingEvidenceItems] = useState<{title: string; wpRef?: string; allowedTypes?: string[]; isRequired: boolean}[]>([]);

  useEffect(() => {
    if (template) {
      setForm({
        procedure_name: template.procedure_name,
        description: template.description,
        area: template.area,
        assertion: template.assertion,
        program_id: template.program_id,
        conclusion_prompt: template.conclusion_prompt,
        default_status: template.default_status,
      });
      setPendingChecklistItems([]);
      setPendingEvidenceItems([]);
    } else {
      setForm({
        procedure_name: '',
        description: null,
        area: '',
        assertion: null,
        program_id: null,
        conclusion_prompt: null,
        default_status: null,
      });
      setPendingChecklistItems([]);
      setPendingEvidenceItems([]);
    }
    setActiveTab('details');
    setNewChecklistText('');
    setNewEvidenceLabel('');
    setNewEvidenceTypes([]);
    setNewEvidenceWpRef('');
  }, [template, open]);

  // Checklist handlers for existing templates
  const handleAddChecklistItem = async () => {
    if (!newChecklistText.trim()) return;
    
    if (template?.id) {
      // Add directly to database for existing templates
      await addChecklistItem(newChecklistText.trim(), newChecklistRequired);
    } else {
      // Queue for new templates
      setPendingChecklistItems([...pendingChecklistItems, { text: newChecklistText.trim(), isRequired: newChecklistRequired }]);
    }
    setNewChecklistText('');
    setNewChecklistRequired(true);
  };

  const handleRemoveChecklistItem = async (item: TemplateChecklistItem | {text: string; isRequired: boolean}, index?: number) => {
    if ('id' in item) {
      // Delete from database
      await deleteChecklistItem(item.id);
    } else if (index !== undefined) {
      // Remove from pending
      setPendingChecklistItems(pendingChecklistItems.filter((_, i) => i !== index));
    }
  };

  // Evidence handlers
  const handleAddEvidenceItem = async () => {
    if (!newEvidenceLabel.trim()) return;
    
    if (template?.id) {
      await addEvidenceRequirement(
        newEvidenceLabel.trim(),
        newEvidenceWpRef.trim() || undefined,
        newEvidenceTypes.length > 0 ? newEvidenceTypes : undefined,
        newEvidenceRequired
      );
    } else {
      setPendingEvidenceItems([...pendingEvidenceItems, {
        title: newEvidenceLabel.trim(),
        wpRef: newEvidenceWpRef.trim() || undefined,
        allowedTypes: newEvidenceTypes.length > 0 ? [...newEvidenceTypes] : undefined,
        isRequired: newEvidenceRequired,
      }]);
    }
    setNewEvidenceLabel('');
    setNewEvidenceRequired(true);
    setNewEvidenceTypes([]);
    setNewEvidenceWpRef('');
  };

  const handleRemoveEvidenceItem = async (item: TemplateEvidenceRequirement | {title: string}, index?: number) => {
    if ('id' in item) {
      await deleteEvidenceRequirement(item.id);
    } else if (index !== undefined) {
      setPendingEvidenceItems(pendingEvidenceItems.filter((_, i) => i !== index));
    }
  };

  const toggleFileType = (type: string) => {
    setNewEvidenceTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!form.procedure_name.trim() || !form.area) return;

    setSaving(true);
    // Save basic template info and get the ID back
    const templateId = await onSave(form);
    
    if (templateId && !template?.id) {
      // This is a new template - now save pending checklist/evidence items
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Save pending checklist items
      for (let i = 0; i < pendingChecklistItems.length; i++) {
        const item = pendingChecklistItems[i];
        await supabase.from('procedure_template_checklist_items').insert({
          procedure_template_id: templateId,
          text: item.text,
          is_required: item.isRequired,
          sort_order: i,
        });
      }
      
      // Save pending evidence items
      for (let i = 0; i < pendingEvidenceItems.length; i++) {
        const item = pendingEvidenceItems[i];
        await supabase.from('procedure_template_evidence_requirements').insert({
          procedure_template_id: templateId,
          title: item.title,
          wp_ref: item.wpRef || null,
          allowed_file_types: item.allowedTypes || [],
          is_required: item.isRequired,
          sort_order: i,
        });
      }
    }
    
    setSaving(false);

    if (templateId !== null) {
      onOpenChange(false);
    }
  };

  // Combine saved + pending for display
  const displayChecklistItems = template?.id 
    ? savedChecklistItems 
    : pendingChecklistItems.map((p, i) => ({ ...p, id: `pending-${i}`, sort_order: i }));
  
  const displayEvidenceItems = template?.id 
    ? savedEvidenceRequirements 
    : pendingEvidenceItems.map((p, i) => ({ ...p, id: `pending-${i}`, sort_order: i, label: p.title, wp_ref_hint: p.wpRef, allowed_types: p.allowedTypes }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Procedure Template' : 'Add Procedure Template'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Update the procedure template details and workpaper fields' 
              : 'Create a reusable procedure template with checklist and evidence requirements'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="gap-1">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              Checklist
              {displayChecklistItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{displayChecklistItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              Evidence
              {displayEvidenceItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{displayEvidenceItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="conclusion" className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Procedure Name *</Label>
                  <Input
                    value={form.procedure_name}
                    onChange={(e) => setForm(f => ({ ...f, procedure_name: e.target.value }))}
                    placeholder="Test revenue cut-off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Area *</Label>
                  <Select 
                    value={form.area} 
                    onValueChange={(v) => setForm(f => ({ ...f, area: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_AREAS.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Program (optional)</Label>
                  <Select
                    value={form.program_id || 'standalone'}
                    onValueChange={(v) => setForm(f => ({ 
                      ...f, 
                      program_id: v === 'standalone' ? null : v 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Standalone procedure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">Standalone</SelectItem>
                      {programs.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assertion</Label>
                  <Select
                    value={form.assertion || ''}
                    onValueChange={(v) => setForm(f => ({ ...f, assertion: v || null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assertion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existence">Existence</SelectItem>
                      <SelectItem value="completeness">Completeness</SelectItem>
                      <SelectItem value="accuracy">Accuracy</SelectItem>
                      <SelectItem value="valuation">Valuation</SelectItem>
                      <SelectItem value="rights">Rights & Obligations</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="cutoff">Cut-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Default status (optional)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            Applied only when creating procedures from this template.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={form.default_status || 'none'}
                    onValueChange={(v) => setForm(f => ({ ...f, default_status: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No default (use system default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default</SelectItem>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description / Objective</Label>
                  <Textarea
                    value={form.description || ''}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value || null }))}
                    placeholder="Detailed procedure steps and objectives..."
                    rows={4}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CHECKLIST TAB */}
          <TabsContent value="checklist" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Add new item */}
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium">Add Checklist Item</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="e.g., Verify invoice dates..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newChecklistRequired}
                        onCheckedChange={setNewChecklistRequired}
                        id="new-required"
                      />
                      <Label htmlFor="new-required" className="text-xs whitespace-nowrap">Required</Label>
                    </div>
                    <Button onClick={handleAddChecklistItem} size="sm" disabled={!newChecklistText.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Checklist items list */}
                {loadingWorkpaper ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                ) : displayChecklistItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No checklist items yet. Add items above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayChecklistItems.map((item, index) => {
                      const isSaved = 'procedure_template_id' in item;
                      const text = isSaved ? (item as TemplateChecklistItem).text : (item as any).text;
                      const isRequired = isSaved ? (item as TemplateChecklistItem).is_required : (item as any).isRequired;
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                          <span className="flex-1 text-sm">{text}</span>
                          {isRequired && (
                            <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleRemoveChecklistItem(item as any, index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* EVIDENCE TAB */}
          <TabsContent value="evidence" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Add new evidence */}
                <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                  <Label className="text-sm font-medium">Add Evidence Requirement</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEvidenceLabel}
                      onChange={(e) => setNewEvidenceLabel(e.target.value)}
                      placeholder="e.g., Bank confirmation letter..."
                      className="flex-1"
                    />
                    <Input
                      value={newEvidenceWpRef}
                      onChange={(e) => setNewEvidenceWpRef(e.target.value)}
                      placeholder="WP Ref (e.g., A.1)"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {ALLOWED_FILE_TYPES.map(type => (
                        <Badge
                          key={type}
                          variant={newEvidenceTypes.includes(type) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleFileType(type)}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newEvidenceRequired}
                        onCheckedChange={setNewEvidenceRequired}
                        id="new-evidence-required"
                      />
                      <Label htmlFor="new-evidence-required" className="text-xs whitespace-nowrap">Required</Label>
                      <Button onClick={handleAddEvidenceItem} size="sm" disabled={!newEvidenceLabel.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Evidence items list */}
                {loadingWorkpaper ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                ) : displayEvidenceItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No evidence requirements yet. Add items above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayEvidenceItems.map((item, index) => {
                      const isSaved = 'procedure_template_id' in item;
                      const title = isSaved ? (item as TemplateEvidenceRequirement).title : (item as any).title || (item as any).label;
                      const wpRef = isSaved ? (item as TemplateEvidenceRequirement).wp_ref : (item as any).wpRef || (item as any).wp_ref_hint;
                      const allowedTypes = isSaved ? (item as TemplateEvidenceRequirement).allowed_file_types : (item as any).allowedTypes || (item as any).allowed_types;
                      const isRequired = isSaved ? (item as TemplateEvidenceRequirement).is_required : (item as any).isRequired;
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <span className="text-sm text-muted-foreground w-6 mt-0.5">{index + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{title}</span>
                              {wpRef && (
                                <span className="text-xs text-muted-foreground">(WP: {wpRef})</span>
                              )}
                            </div>
                            {allowedTypes && allowedTypes.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {allowedTypes.map((type: string) => (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {isRequired && (
                            <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleRemoveEvidenceItem(item as any, index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CONCLUSION / PREVIEW TAB */}
          <TabsContent value="conclusion" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Conclusion Prompt</Label>
                  <Textarea
                    value={form.conclusion_prompt || ''}
                    onChange={(e) => setForm(f => ({ ...f, conclusion_prompt: e.target.value || null }))}
                    placeholder="e.g., Based on the procedures performed, conclude on the existence and valuation of revenue..."
                    rows={4}
                  />
                </div>

                {/* Preview Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Template Preview</h4>
                  <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Procedure: </span>
                      {form.procedure_name || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Area: </span>
                      {form.area || <span className="text-muted-foreground italic">Not set</span>}
                    </div>
                    {form.assertion && (
                      <div className="text-sm">
                        <span className="font-medium">Assertion: </span>
                        <span className="capitalize">{form.assertion}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Checklist: </span>
                      {displayChecklistItems.length} item(s)
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Evidence Required: </span>
                      {displayEvidenceItems.length} item(s)
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-xs text-muted-foreground italic">
                    Templates are illustrative; tailor per engagement using professional judgement.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.procedure_name.trim() || !form.area}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

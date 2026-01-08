import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Eye, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { KeyAuditMattersEditor } from './KeyAuditMattersEditor';
import { useKeyAuditMatters } from '@/hooks/useKeyAuditMatters';
import { useAuditReportSetup } from '@/hooks/useAuditReportSetup';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { usePartners } from '@/hooks/usePartners';
import {
  type AuditReportMainContent,
  type EmphasisOfMatterItem,
  type OtherMatterItem,
  useAuditReportContent,
} from '@/hooks/useAuditReportContent';
import { QUALIFIED_BASIS_EXAMPLE, ADVERSE_BASIS_EXAMPLE, DISCLAIMER_BASIS_EXAMPLE } from '@/data/qualifiedExamples';
import { AuditReportGenerator } from '@/services/auditReportGenerator';
import { STATUS_OPTIONS, type StatusValue } from '@/data/auditReportStandardWordings';

interface MainReportEditorProps {
  engagementId: string;
  clientName: string;
  financialYear: string;
}

const statusItems = STATUS_OPTIONS;

function coerceNumber(value: string) {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function StatusSelect({
  value,
  onValueChange,
}: {
  value: StatusValue | null | undefined;
  onValueChange: (v: StatusValue) => void;
}) {
  return (
    <Select value={(value || '') as any} onValueChange={(v) => onValueChange(v as StatusValue)}>
      <SelectTrigger>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {statusItems.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MainReportEditor({ engagementId, clientName, financialYear }: MainReportEditorProps) {
  const [activeTab, setActiveTab] = useState('configuration');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ifcManualOverride, setIfcManualOverride] = useState(false);

  const { setup, saveSetup } = useAuditReportSetup(engagementId);
  const { content, loading: contentLoading, saveContent } = useAuditReportContent(engagementId);
  const { kams } = useKeyAuditMatters(engagementId);
  const { firmSettings } = useFirmSettings();
  const { getPartnerById } = usePartners();

  // Get signing partner details from partners table
  const signingPartner = setup?.signing_partner_id ? getPartnerById(setup.signing_partner_id) : null;

  const [draft, setDraft] = useState<AuditReportMainContent | null>(null);
  const [editorBasis, setEditorBasis] = useState<string>('');
  const [savedExampleForDraftId, setSavedExampleForDraftId] = useState<string | null>(null);

  // Auto-calculate IFC applicability
  useEffect(() => {
    if (!setup || ifcManualOverride) return;

    // IFC Applicability: If ANY of these criteria are checked, IFC is applicable
    const computedApplicability =
      Boolean(setup.is_public_company) ||
      Boolean(setup.is_private_exceeding_threshold) ||
      Boolean(setup.is_private_non_exceeding_threshold) ||
      Boolean(setup.is_listed_company) ||
      Boolean(setup.is_subsidiary) ||
      Boolean(setup.is_holding_company);

    // Only update if the computed value differs from current value
    if (setup.ifc_applicable !== computedApplicability) {
      saveSetupPatch({ ifc_applicable: computedApplicability });
    }
  }, [
    setup?.is_public_company,
    setup?.is_private_exceeding_threshold,
    setup?.is_private_non_exceeding_threshold,
    setup?.is_listed_company,
    setup?.is_subsidiary,
    setup?.is_holding_company,
    ifcManualOverride,
  ]);

  useEffect(() => {
    if (content?.id) setDraft(content);
  }, [content?.id]);

  useEffect(() => {
    // Initialize editorBasis: show user's basis if present, otherwise show illustrative example for qualified/adverse opinion
    if (!draft) return;
    if (draft.opinion_type === 'qualified') {
      setEditorBasis(draft.basis_for_opinion?.trim() ? draft.basis_for_opinion : QUALIFIED_BASIS_EXAMPLE);
    } else if (draft.opinion_type === 'adverse') {
      setEditorBasis(draft.basis_for_opinion?.trim() ? draft.basis_for_opinion : ADVERSE_BASIS_EXAMPLE);
    } else if (draft.opinion_type === 'disclaimer') {
      setEditorBasis(draft.basis_for_opinion?.trim() ? draft.basis_for_opinion : DISCLAIMER_BASIS_EXAMPLE);
    } else {
      setEditorBasis(draft.basis_for_opinion || '');
    }
  }, [draft?.id, draft?.opinion_type, draft?.basis_for_opinion]);

  useEffect(() => {
    // Auto-populate and persist illustrative basis into existing drafts when missing (qualified/adverse)
    if (!draft) return;
    const shouldPopulate = (type: AuditReportMainContent['opinion_type']) =>
      draft.opinion_type === type && !(draft.basis_for_opinion?.trim()) && draft.id !== savedExampleForDraftId;

    if (shouldPopulate('qualified')) {
      const example = QUALIFIED_BASIS_EXAMPLE;
      const patched: Partial<AuditReportMainContent> = {
        basis_for_opinion: example,
        basis_for_opinion_is_example: true,
      };
      (async () => {
        const saved = await saveContent({ ...(draft as any), ...(patched as any) });
        if (saved) {
          setDraft(saved as AuditReportMainContent);
          setSavedExampleForDraftId(draft.id);
          toast.success('Illustrative qualified basis populated (editable)');
        }
      })();
    } else if (shouldPopulate('adverse')) {
      const example = ADVERSE_BASIS_EXAMPLE;
      const patched: Partial<AuditReportMainContent> = {
        basis_for_opinion: example,
        basis_for_opinion_is_example: true,
      };
      (async () => {
        const saved = await saveContent({ ...(draft as any), ...(patched as any) });
        if (saved) {
          setDraft(saved as AuditReportMainContent);
          setSavedExampleForDraftId(draft.id);
          toast.success('Illustrative adverse basis placeholder added (editable)');
        }
      })();
    } else if (shouldPopulate('disclaimer')) {
      const example = DISCLAIMER_BASIS_EXAMPLE;
      const patched: Partial<AuditReportMainContent> = {
        basis_for_opinion: example,
        basis_for_opinion_is_example: true,
      };
      (async () => {
        const saved = await saveContent({ ...(draft as any), ...(patched as any) });
        if (saved) {
          setDraft(saved as AuditReportMainContent);
          setSavedExampleForDraftId(draft.id);
          toast.success('Illustrative disclaimer basis placeholder added (editable)');
        }
      })();
    }
  }, [draft?.id, draft?.opinion_type, draft?.basis_for_opinion, savedExampleForDraftId, saveContent]);

  const generator = useMemo(() => {
    if (!setup || !draft) return null;
    return new AuditReportGenerator({
      setup,
      content: draft,
      kams,
      clientName,
      financialYearLabel: financialYear,
      firmSettings: firmSettings || undefined,
      signingPartner: signingPartner || undefined,
    });
  }, [setup, draft, kams, clientName, financialYear, firmSettings, signingPartner]);

  const previewBlocks = useMemo(() => generator?.generateBlocks() ?? [], [generator]);

  const updateDraft = (patch: Partial<AuditReportMainContent>) => {
    setDraft((prev) => (prev ? ({ ...prev, ...patch } as AuditReportMainContent) : prev));
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    const saved = await saveContent(draft);
    setSaving(false);
    if (saved) toast.success('Main report saved');
  };

  const saveSetupPatch = async (patch: Record<string, any>) => {
    setSaving(true);
    const saved = await saveSetup(patch);
    setSaving(false);
    if (saved) toast.success('Configuration saved');
  };

  // Helper function to update IFC criteria checkboxes and reset manual override
  const updateIfcCriteria = (patch: Record<string, any>) => {
    setIfcManualOverride(false); // Reset manual override when criteria change
    saveSetupPatch(patch);
  };

  const addEomItem = () => {
    const next: EmphasisOfMatterItem = {
      title: '',
      paragraph:
        'We draw attention to Note ______ of the standalone financial statements___________________________________ which describes_______________________________________(user defined)',
      note_ref: '',
      is_example: true,
    };
    updateDraft({
      has_emphasis_of_matter: true,
      emphasis_of_matter_items: [...(draft?.emphasis_of_matter_items || []), next],
    });
  };

  const addOtherMatterItem = () => {
    const next: OtherMatterItem = { title: 'Other Matter', paragraph: '' };
    updateDraft({
      has_other_matter: true,
      other_matter_items: [...(draft?.other_matter_items || []), next],
    });
  };

  if (contentLoading || !draft) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report editor…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (previewMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Generated from current configuration and saved content</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Back to Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh]">
            <div className="mx-auto max-w-3xl space-y-4 p-4">
              {previewBlocks.map((b, idx) => {
                if (b.kind === 'title') {
                  return (
                    <div key={idx} className="text-center">
                      <h2 className="text-lg font-semibold">{b.text}</h2>
                    </div>
                  );
                }
                if (b.kind === 'subtitle') {
                  return (
                    <div key={idx} className="text-center text-sm text-muted-foreground">
                      {b.text}
                    </div>
                  );
                }
                if (b.kind === 'heading') {
                  return (
                    <div key={idx} className="pt-2">
                      <h3 className="text-sm font-semibold">{b.text}</h3>
                      <Separator className="mt-2" />
                    </div>
                  );
                }
                if (b.kind === 'subheading') {
                  return (
                    <h4 key={idx} className="text-sm font-semibold pt-2">
                      {b.text}
                    </h4>
                  );
                }
                if (b.kind === 'paragraph') {
                  const highlight = (b as any).highlight === 'yellow';
                  return (
                    <p
                      key={idx}
                      className={`text-sm leading-relaxed whitespace-pre-wrap text-justify ${
                        highlight ? 'bg-yellow-100 p-2 rounded' : ''
                      }`}
                    >
                      {b.text}
                    </p>
                  );
                }
                if (b.kind === 'signature') {
                  return (
                    <div key={idx} className="pt-4 text-sm">
                      <div className="text-right whitespace-pre-wrap">
                        {b.lines.join('\n')}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Main Audit Report
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={saveDraft} className="gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="configuration">Config</TabsTrigger>
            <TabsTrigger value="opinion">Opinion</TabsTrigger>
            <TabsTrigger value="optional" className="text-[11px] px-1">KAM/EoM/Other Matter</TabsTrigger>
            <TabsTrigger value="sa720" className="text-[11px] px-1">Other Info-SA 720</TabsTrigger>
            <TabsTrigger value="s143" className="text-[11px] px-1">143(3)-Co Act</TabsTrigger>
            <TabsTrigger value="rule11" className="text-[11px] px-1">Rule 11-Co Audit Rule</TabsTrigger>
            <TabsTrigger value="signature">Signature</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* 1) Configuration */}
          <TabsContent value="configuration" className="space-y-6">
            {!setup ? (
              <p className="text-sm text-muted-foreground">Setup not found. Complete the Setup step first.</p>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted/50 p-3 rounded-md border">
                  <p className="text-sm font-medium">
                    <span className="font-semibold">Instruction:</span> Select all cases that are applicable to the entity for the relevant financial year.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_small_company)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_small_company: !!v })}
                    />
                    <Label className="font-normal">Small Company</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_opc)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_opc: !!v })}
                    />
                    <Label className="font-normal">One Person Company (OPC)</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_public_company)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_public_company: !!v })}
                    />
                    <Label className="font-normal">Public Company</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_private_exceeding_threshold)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_private_exceeding_threshold: !!v })}
                    />
                    <Label className="font-normal">Private limited company with Previous year turnover is  Rs 50 Crores or more</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_private_non_exceeding_threshold)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_private_non_exceeding_threshold: !!v })}
                    />
                    <Label className="font-normal">Private limited company with Current year during at any point of time exceeding Rs 25Crores</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.cash_flow_required)}
                      onCheckedChange={(v) => saveSetupPatch({ cash_flow_required: !!v })}
                    />
                    <Label className="font-normal">Cash Flow Statement included</Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-normal">Company Result for the Year</Label>
                    <RadioGroup
                      value={setup.company_profit_or_loss || ''}
                      onValueChange={(v) => saveSetupPatch({ company_profit_or_loss: v || null })}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="profit" id="profit" />
                        <Label htmlFor="profit" className="font-normal cursor-pointer">Profit</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="loss" id="loss" />
                        <Label htmlFor="loss" className="font-normal cursor-pointer">Loss</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.ifc_applicable)}
                      onCheckedChange={(v) => {
                        setIfcManualOverride(true);
                        saveSetupPatch({ ifc_applicable: !!v });
                      }}
                    />
                    <Label className="font-normal">IFC reporting applicable</Label>
                    {ifcManualOverride && (
                      <span className="text-xs text-amber-600 font-medium">manual override</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_listed_company)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_listed_company: !!v })}
                    />
                    <Label className="font-normal">Listed company (KAMs typically required)</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_subsidiary)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_subsidiary: !!v })}
                    />
                    <Label className="font-normal">is a subsidiary</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.is_holding_company)}
                      onCheckedChange={(v) => updateIfcCriteria({ is_holding_company: !!v })}
                    />
                    <Label className="font-normal">is a holding company</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.has_associates)}
                      onCheckedChange={(v) => saveSetupPatch({ has_associates: !!v })}
                    />
                    <Label className="font-normal">has associates</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.has_branch_auditors)}
                      onCheckedChange={(v) => saveSetupPatch({ has_branch_auditors: !!v })}
                    />
                    <Label className="font-normal">Branch auditors involved</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(setup.has_predecessor_auditor)}
                      onCheckedChange={(v) => saveSetupPatch({ has_predecessor_auditor: !!v })}
                    />
                    <Label className="font-normal">Predecessor auditor</Label>
                  </div>
                </div>

                {setup.has_branch_auditors && (
                  <div className="space-y-2">
                    <Label>Branch locations</Label>
                    <Textarea
                      value={setup.branch_locations || ''}
                      onChange={(e) => saveSetupPatch({ branch_locations: e.target.value })}
                      rows={2}
                      placeholder="List branch locations (comma-separated)"
                    />
                  </div>
                )}

                {setup.has_predecessor_auditor && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Predecessor auditor name</Label>
                      <Input
                        value={setup.predecessor_auditor_name || ''}
                        onChange={(e) => saveSetupPatch({ predecessor_auditor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Predecessor report date</Label>
                      <Input
                        type="date"
                        value={setup.predecessor_report_date || ''}
                        onChange={(e) => saveSetupPatch({ predecessor_report_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CARO annexure letter</Label>
                    <Input
                      value={setup.caro_annexure_letter || ''}
                      onChange={(e) => saveSetupPatch({ caro_annexure_letter: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFC annexure letter</Label>
                    <Input
                      value={setup.ifc_annexure_letter || ''}
                      onChange={(e) => saveSetupPatch({ ifc_annexure_letter: e.target.value })}
                      placeholder="B"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 2) Opinion */}
          <TabsContent value="opinion" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opinion type</Label>
                <Select
                  value={draft.opinion_type}
                  onValueChange={(v) => updateDraft({ opinion_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select opinion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unqualified">Unqualified (Clean)</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="adverse">Adverse</SelectItem>
                    <SelectItem value="disclaimer">Disclaimer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-7">
                <Checkbox
                  checked={Boolean(draft.has_going_concern_uncertainty)}
                  onCheckedChange={(v) => updateDraft({ has_going_concern_uncertainty: !!v })}
                />
                <Label className="font-normal">Include going concern uncertainty paragraph</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Basis for opinion (editable)</Label>
              <Textarea
                rows={5}
                value={editorBasis}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditorBasis(v);
                  // Persist into draft when user edits (so preview will show user text)
                  updateDraft({ basis_for_opinion: v, basis_for_opinion_is_example: false });
                }}
                placeholder="Leave blank to use the standard starter wording in Preview."
              />
            </div>

            {draft.opinion_type !== 'unqualified' && (
              <div className="space-y-2">
                <Label>Qualification / basis details (if any)</Label>
                <Textarea
                  rows={4}
                  value={draft.qualification_details || ''}
                  onChange={(e) => updateDraft({ qualification_details: e.target.value })}
                  placeholder="Describe the matter(s) leading to the modification of opinion."
                />
              </div>
            )}

            {draft.has_going_concern_uncertainty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Going concern details</Label>
                  <Textarea
                    rows={3}
                    value={draft.going_concern_details || ''}
                    onChange={(e) => updateDraft({ going_concern_details: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Note reference</Label>
                  <Input
                    value={draft.going_concern_note_ref || ''}
                    onChange={(e) => updateDraft({ going_concern_note_ref: e.target.value })}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* 3) Optional paragraphs */}
          <TabsContent value="optional" className="space-y-6">
            <div className="bg-muted/50 p-3 rounded-md border">
              <p className="text-sm font-medium">
                <span className="font-semibold">Standards Reference:</span> SA 701 - KAM; SA 706 - EoM/Other Matter
              </p>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <Label>Key Audit Matters</Label>
                <p className="text-sm text-muted-foreground">Toggle inclusion and manage KAMs</p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Boolean(draft.include_kam)}
                  onCheckedChange={(v) => updateDraft({ include_kam: !!v })}
                />
                <Label className="font-normal">Include KAM section</Label>
              </div>
            </div>
            {draft.include_kam && <KeyAuditMattersEditor engagementId={engagementId} />}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Emphasis of Matter</Label>
                <p className="text-sm text-muted-foreground">Add one or more emphasis paragraphs</p>
              </div>
              <Button variant="outline" onClick={addEomItem}>
                Add item
              </Button>
            </div>

            {(draft.emphasis_of_matter_items || []).map((item, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const next = [...(draft.emphasis_of_matter_items || [])];
                          next[idx] = { ...next[idx], title: e.target.value, is_example: false };
                          updateDraft({ emphasis_of_matter_items: next, has_emphasis_of_matter: true });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Note reference</Label>
                      <Input
                        value={item.note_ref || ''}
                        onChange={(e) => {
                          const next = [...(draft.emphasis_of_matter_items || [])];
                          next[idx] = { ...next[idx], note_ref: e.target.value, is_example: false };
                          updateDraft({ emphasis_of_matter_items: next, has_emphasis_of_matter: true });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Paragraph</Label>
                    <Textarea
                      rows={3}
                      value={item.paragraph}
                      onChange={(e) => {
                        const next = [...(draft.emphasis_of_matter_items || [])];
                        next[idx] = { ...next[idx], paragraph: e.target.value, is_example: false };
                        updateDraft({ emphasis_of_matter_items: next, has_emphasis_of_matter: true });
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = (draft.emphasis_of_matter_items || []).filter((_, i) => i !== idx);
                        updateDraft({
                          emphasis_of_matter_items: next,
                          has_emphasis_of_matter: next.length > 0,
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Other Matter</Label>
                <p className="text-sm text-muted-foreground">Add one or more other matter paragraphs</p>
              </div>
              <Button variant="outline" onClick={addOtherMatterItem}>
                Add item
              </Button>
            </div>

            {(draft.other_matter_items || []).map((item, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6 space-y-3">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => {
                        const next = [...(draft.other_matter_items || [])];
                        next[idx] = { ...next[idx], title: e.target.value };
                        updateDraft({ other_matter_items: next, has_other_matter: true });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paragraph</Label>
                    <Textarea
                      rows={3}
                      value={item.paragraph}
                      onChange={(e) => {
                        const next = [...(draft.other_matter_items || [])];
                        next[idx] = { ...next[idx], paragraph: e.target.value };
                        updateDraft({ other_matter_items: next, has_other_matter: true });
                      }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = (draft.other_matter_items || []).filter((_, i) => i !== idx);
                        updateDraft({
                          other_matter_items: next,
                          has_other_matter: next.length > 0,
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 4) SA 720 */}
          <TabsContent value="sa720" className="space-y-6">
            <div className="space-y-2">
              <Label>Board report / other information status</Label>
              <Select
                value={draft.board_report_status || 'received_no_misstatement'}
                onValueChange={(v) => updateDraft({ board_report_status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received_no_misstatement">Received - no material misstatement</SelectItem>
                  <SelectItem value="received_material_misstatement">Received - material misstatement found</SelectItem>
                  <SelectItem value="not_received">Not received at report date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.board_report_status === 'received_material_misstatement' && (
              <div className="space-y-2">
                <Label>Misstatement details</Label>
                <Textarea
                  rows={4}
                  value={draft.board_report_misstatement_details || ''}
                  onChange={(e) => updateDraft({ board_report_misstatement_details: e.target.value })}
                />
              </div>
            )}
          </TabsContent>

          {/* 5) Section 143(3) */}
          <TabsContent value="s143" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>143(3)(a) Information and explanations obtained</Label>
                <Select
                  value={draft.clause_143_3_a_information_status || 'standard'}
                  onValueChange={(v) => updateDraft({ clause_143_3_a_information_status: v as StatusValue })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (auto-adapts to opinion type)</SelectItem>
                    <SelectItem value="qualified">Qualified / Other remarks (user-defined)</SelectItem>
                  </SelectContent>
                </Select>
                {draft.clause_143_3_a_information_status === 'qualified' && (
                  <Textarea
                    rows={2}
                    value={draft.clause_143_3_a_information_details || ''}
                    onChange={(e) => updateDraft({ clause_143_3_a_information_details: e.target.value })}
                    placeholder="Provide custom paragraph for qualified/modified response"
                    className={!draft.clause_143_3_a_information_details?.trim() ? 'bg-yellow-50' : ''}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>143(3)(b) Proper books of account</Label>
                <StatusSelect
                  value={draft.clause_143_3_a_status}
                  onValueChange={(v) => updateDraft({ clause_143_3_a_status: v })}
                />
                <Textarea
                  rows={3}
                  value={draft.clause_143_3_a_details || ''}
                  onChange={(e) => updateDraft({ clause_143_3_a_details: e.target.value })}
                  placeholder="Details / remarks (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>143(3)(c) Branch returns</Label>
                <Textarea
                  rows={3}
                  value={draft.clause_143_3_c_branch_returns || ''}
                  onChange={(e) => updateDraft({ clause_143_3_c_branch_returns: e.target.value })}
                />
              </div>

              {draft.has_going_concern_uncertainty && (
                <div className="space-y-2">
                  <Label>143(3)(e) Going concern - SA 570 reporting</Label>
                  <p className="text-sm text-muted-foreground">
                    This field appears because you have marked "Material Uncertainty - Going Concern" in the Opinion section.
                  </p>
                  <Textarea
                    rows={3}
                    value={draft.clause_143_3_e_going_concern_impact || ''}
                    onChange={(e) => updateDraft({ clause_143_3_e_going_concern_impact: e.target.value })}
                    placeholder="Provide details if going concern uncertainty requires reporting under Section 143(3)"
                    className={!draft.clause_143_3_e_going_concern_impact?.trim() ? 'bg-yellow-50' : ''}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>143(3)(f) Internal Financial Controls (IFC)</Label>
                <Textarea
                  rows={3}
                  value={draft.clause_143_3_i_ifc_qualification || ''}
                  onChange={(e) => updateDraft({ clause_143_3_i_ifc_qualification: e.target.value })}
                  placeholder="Summary / qualification (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>143(3)(g) Directors disqualified (Section 164(2))</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(draft.clause_143_3_f_directors_disqualified)}
                    onCheckedChange={(v) => updateDraft({ clause_143_3_f_directors_disqualified: !!v })}
                  />
                  <Label className="font-normal">Disqualification identified</Label>
                </div>
                <Textarea
                  rows={3}
                  value={draft.clause_143_3_f_disqualified_details || ''}
                  onChange={(e) => updateDraft({ clause_143_3_f_disqualified_details: e.target.value })}
                  placeholder="Details (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>143(3)(h) Managerial remuneration</Label>
                <StatusSelect
                  value={draft.clause_143_3_h_remuneration_status}
                  onValueChange={(v) => updateDraft({ clause_143_3_h_remuneration_status: v })}
                />
                <Textarea
                  rows={3}
                  value={draft.clause_143_3_h_details || ''}
                  onChange={(e) => updateDraft({ clause_143_3_h_details: e.target.value })}
                  placeholder="Details / remarks (optional)"
                />
              </div>
            </div>
          </TabsContent>

          {/* 6) Rule 11 */}
          <TabsContent value="rule11" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Rule 11(a) Pending litigations</Label>
                <Select
                  value={draft.rule_11_a_pending_litigations || ''}
                  onValueChange={(v) => updateDraft({ rule_11_a_pending_litigations: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="has_litigations_disclosed">Pending litigation present and impact disclosed in financial statements</SelectItem>
                    <SelectItem value="has_litigations_not_disclosed">Pending litigation present but NOT disclosed in the financial statements</SelectItem>
                    <SelectItem value="no_litigations">No pending litigation exists which would impact its financial position</SelectItem>
                  </SelectContent>
                </Select>
                {draft.rule_11_a_pending_litigations === 'has_litigations_disclosed' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Note reference</Label>
                    <Input
                      value={draft.rule_11_a_note_ref || ''}
                      onChange={(e) => updateDraft({ rule_11_a_note_ref: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Rule 11(b) Long-term contracts / derivatives</Label>
                <Select
                  value={draft.rule_11_b_long_term_contracts || ''}
                  onValueChange={(v) => updateDraft({ rule_11_b_long_term_contracts: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="has_made_provision">Has made provision of material foreseeable losses on long-term contracts including derivative contracts and disclosed in financial statements</SelectItem>
                    <SelectItem value="has_not_made_provision">Has NOT made provision of material foreseeable losses on long-term contracts including derivative contracts</SelectItem>
                    <SelectItem value="no_contracts">The Company did not have any long-term contracts including derivative contracts as at financial year end</SelectItem>
                  </SelectContent>
                </Select>
                {draft.rule_11_b_long_term_contracts === 'has_made_provision' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Note reference</Label>
                    <Input
                      value={draft.rule_11_b_note_ref || ''}
                      onChange={(e) => updateDraft({ rule_11_b_note_ref: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Rule 11(c) IEPF transfers</Label>
                <StatusSelect
                  value={draft.rule_11_c_iepf_status}
                  onValueChange={(v) => updateDraft({ rule_11_c_iepf_status: v })}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Delay amount (if any)</Label>
                    <Input
                      value={draft.rule_11_c_delay_amount == null ? '' : String(draft.rule_11_c_delay_amount)}
                      onChange={(e) => updateDraft({ rule_11_c_delay_amount: coerceNumber(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Textarea
                  rows={3}
                  value={draft.rule_11_c_delay_details || ''}
                  onChange={(e) => updateDraft({ rule_11_c_delay_details: e.target.value })}
                  placeholder="Details (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Rule 11(e) Funds routing via intermediaries</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Covers both: (a) funds advanced via intermediaries and (b) funds received via intermediaries
                </div>
                <Select
                  value={draft.rule_11_g_funds_advanced_status || 'yes'}
                  onValueChange={(v) => updateDraft({ rule_11_g_funds_advanced_status: v as StatusValue })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes / Standard paragraph (no funds routed)</SelectItem>
                    <SelectItem value="no">No / Non-compliance (provide details)</SelectItem>
                    <SelectItem value="qualified">Qualified / With remarks (provide details)</SelectItem>
                  </SelectContent>
                </Select>
                {(draft.rule_11_g_funds_advanced_status === 'no' || draft.rule_11_g_funds_advanced_status === 'qualified') && (
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    <strong>Reference:</strong> For different type of reporting for modification in above clauses relating to Rule 11(e), refer to Illustrative reporting formats on modifications in Implementation Guide on Reporting under Rule 11(e) & 11(f) issued by ICAI
                  </div>
                )}
                <Textarea
                  rows={3}
                  value={draft.rule_11_g_funds_advanced_details || ''}
                  onChange={(e) => updateDraft({ rule_11_g_funds_advanced_details: e.target.value })}
                  placeholder="Details for modified reporting (only if selecting No or Qualified)"
                />
              </div>

              <div className="space-y-2">
                <Label>Rule 11(f) Dividend (Section 123 compliance)</Label>
                <Select
                  value={draft.rule_11_e_dividend_status || 'na'}
                  onValueChange={(v) => updateDraft({ rule_11_e_dividend_status: v as StatusValue })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="na">Not applicable - No dividend</SelectItem>
                    <SelectItem value="yes">Yes / Complied - Standard reporting</SelectItem>
                    <SelectItem value="no">No / Non-compliance</SelectItem>
                    <SelectItem value="qualified">Qualified / With modifications</SelectItem>
                  </SelectContent>
                </Select>
                {(draft.rule_11_e_dividend_status === 'yes' || draft.rule_11_e_dividend_status === 'no' || draft.rule_11_e_dividend_status === 'qualified') && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Note reference in financial statements</Label>
                      <Input
                        value={draft.rule_11_e_dividend_note_ref || ''}
                        onChange={(e) => updateDraft({ rule_11_e_dividend_note_ref: e.target.value })}
                        placeholder="Note number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Select applicable dividend types:</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(draft.rule_11_e_interim_dividend_paid)}
                          onCheckedChange={(v) => updateDraft({ rule_11_e_interim_dividend_paid: !!v })}
                        />
                        <Label className="font-normal">(a) Interim dividend declared and paid</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(draft.rule_11_e_interim_dividend_declared_not_paid)}
                          onCheckedChange={(v) => updateDraft({ rule_11_e_interim_dividend_declared_not_paid: !!v })}
                        />
                        <Label className="font-normal">(a) Interim dividend declared but not yet paid</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(draft.rule_11_e_final_dividend_previous_year)}
                          onCheckedChange={(v) => updateDraft({ rule_11_e_final_dividend_previous_year: !!v })}
                        />
                        <Label className="font-normal">(b) Final dividend paid for previous year</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(draft.rule_11_e_final_dividend_proposed)}
                          onCheckedChange={(v) => updateDraft({ rule_11_e_final_dividend_proposed: !!v })}
                        />
                        <Label className="font-normal">(c) Final dividend proposed for current year</Label>
                      </div>
                    </div>
                  </>
                )}
                {(draft.rule_11_e_dividend_status === 'no' || draft.rule_11_e_dividend_status === 'qualified') && (
                  <>
                    <Textarea
                      rows={4}
                      value={draft.rule_11_e_dividend_details || ''}
                      onChange={(e) => updateDraft({ rule_11_e_dividend_details: e.target.value })}
                      placeholder="Provide detailed reporting for modifications/non-compliance in Rule 11(f)"
                    />
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      <strong>Reference:</strong> For different type of reporting for modification in above clauses relating to Rule 11(f), refer to Illustrative reporting formats on modifications in Implementation Guide on Reporting under Rule 11(e) & 11(f) issued by ICAI
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Rule 11(g) Audit trail (Rule 3(1))</Label>
                <Select
                  value={draft.rule_11_f_audit_trail_status || ''}
                  onValueChange={(v) => updateDraft({ rule_11_f_audit_trail_status: v as StatusValue })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes / Complied</SelectItem>
                    <SelectItem value="no">No / Not complied</SelectItem>
                    <SelectItem value="qualified">Qualified / With remarks</SelectItem>
                  </SelectContent>
                </Select>
                {(draft.rule_11_f_audit_trail_status === 'no' || draft.rule_11_f_audit_trail_status === 'qualified') && (
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    <strong>Reference:</strong> Refer various illustrations given in Implementation Guide on Reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014
                  </div>
                )}
                <Textarea
                  rows={3}
                  value={draft.rule_11_f_audit_trail_details || ''}
                  onChange={(e) => updateDraft({ rule_11_f_audit_trail_details: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          {/* 7) Signature */}
          <TabsContent value="signature" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Firm name</Label>
                <Input
                  value={draft.firm_name || ''}
                  onChange={(e) => updateDraft({ firm_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Firm registration no.</Label>
                <Input
                  value={draft.firm_registration_no || ''}
                  onChange={(e) => updateDraft({ firm_registration_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Partner name</Label>
                <Input
                  value={draft.partner_name || ''}
                  onChange={(e) => updateDraft({ partner_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Membership no.</Label>
                <Input
                  value={draft.membership_no || ''}
                  onChange={(e) => updateDraft({ membership_no: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {!setup ? (
              <p className="text-sm text-muted-foreground">Setup not loaded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Place (report city)</Label>
                  <Input
                    value={setup.report_city || ''}
                    onChange={(e) => saveSetupPatch({ report_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report date</Label>
                  <Input
                    type="date"
                    value={setup.report_date || ''}
                    onChange={(e) => saveSetupPatch({ report_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UDIN</Label>
                  <Input value={setup.udin || ''} onChange={(e) => saveSetupPatch({ udin: e.target.value })} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* 8) Preview */}
          <TabsContent value="preview" className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => setPreviewMode(true)}>
              Open full preview
            </Button>
            <div className="rounded-md border">
              <ScrollArea className="h-[45vh]">
                <div className="p-4 space-y-3">
                  {previewBlocks
                    .filter((b) => b.kind !== 'signature')
                    .slice(0, 18)
                    .map((b, idx) => (
                      <p key={idx} className="text-sm whitespace-pre-wrap">
                        {'text' in b ? (b as any).text : ''}
                      </p>
                    ))}
                  <p className="text-xs text-muted-foreground">(Preview truncated — open full preview.)</p>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

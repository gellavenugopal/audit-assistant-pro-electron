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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { AuditReportGenerator } from '@/services/auditReportGenerator';
import { STATUS_OPTIONS, type StatusValue } from '@/data/auditReportStandardWordings';
import { useAuditReportDocument } from '@/hooks/useAuditReportDocument';
import { REPORT_PREVIEW_STYLES } from '@/utils/auditReportPreviewStyles';
import { buildMainReportPreviewHtml } from '@/utils/auditReportPreviewHtml';
import {
  MAIN_REPORT_PREVIEW_SECTION,
  MAIN_REPORT_PREVIEW_TITLE,
} from '@/data/auditReportPreviewSections';

interface MainReportEditorProps {
  engagementId: string;
  clientName: string;
  financialYear: string;
  onSetupRefresh?: () => void;
}

const statusItems = STATUS_OPTIONS;
const KAM_ENABLED = false;

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

export function MainReportEditor({ engagementId, clientName, financialYear, onSetupRefresh }: MainReportEditorProps) {
  const [activeTab, setActiveTab] = useState('configuration');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSeeded, setPreviewSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ifcManualOverride, setIfcManualOverride] = useState(false);
  const optionalTabLabel = KAM_ENABLED ? 'KAM/EoM/Other Matter' : 'EoM/Other Matter';
  const standardsReference = KAM_ENABLED
    ? 'SA 701 - KAM; SA 706 - EoM/Other Matter'
    : 'SA 706 - EoM/Other Matter';

  const { setup, saveSetup } = useAuditReportSetup(engagementId);
  const { content, loading: contentLoading, saveContent } = useAuditReportContent(engagementId);
  const { kams } = useKeyAuditMatters(engagementId);
  const { firmSettings } = useFirmSettings();
  const { getPartnerById } = usePartners();
  const {
    document: previewDocument,
    saving: previewSaving,
    saveDocument: savePreviewDocument,
  } = useAuditReportDocument(engagementId, MAIN_REPORT_PREVIEW_SECTION, MAIN_REPORT_PREVIEW_TITLE);

  // Get signing partner details from partners table
  const signingPartner = setup?.signing_partner_id ? getPartnerById(setup.signing_partner_id) : null;
  const isPublicCompanyType = setup?.company_type === 'public_company';
  const hasProfitOrLoss = Boolean(setup?.company_profit_or_loss);
  const configDisabled = !hasProfitOrLoss;
  const computedIfcApplicability = useMemo(() => {
    if (!setup) return null;
    return Boolean(
      setup.is_public_company ||
        setup.is_private_exceeding_threshold ||
        setup.is_private_non_exceeding_threshold ||
        setup.is_listed_company ||
        setup.is_subsidiary ||
        setup.is_holding_company
    );
  }, [
    setup?.is_public_company,
    setup?.is_private_exceeding_threshold,
    setup?.is_private_non_exceeding_threshold,
    setup?.is_listed_company,
    setup?.is_subsidiary,
    setup?.is_holding_company,
  ]);
  const hasStoredIfcOverride =
    setup?.ifc_applicable != null &&
    computedIfcApplicability != null &&
    setup.ifc_applicable !== computedIfcApplicability;
  const ifcOverrideActive = ifcManualOverride || hasStoredIfcOverride;

  const [draft, setDraft] = useState<AuditReportMainContent | null>(null);
  const [editorBasis, setEditorBasis] = useState<string>('');

  // Auto-calculate IFC applicability unless user has overridden it
  useEffect(() => {
    if (!setup || computedIfcApplicability == null || ifcOverrideActive) return;

    if (setup.ifc_applicable !== computedIfcApplicability) {
      saveSetupPatch({ ifc_applicable: computedIfcApplicability });
    }
  }, [setup?.ifc_applicable, computedIfcApplicability, ifcOverrideActive]);

  useEffect(() => {
    if (!setup || !isPublicCompanyType || ifcOverrideActive) return;

    const patch: Record<string, any> = {};

    if (!setup.is_public_company) patch.is_public_company = true;
    if (!setup.cash_flow_required) patch.cash_flow_required = true;
    if (!setup.ifc_applicable) patch.ifc_applicable = true;
    if (setup.is_private_exceeding_threshold) patch.is_private_exceeding_threshold = false;
    if (setup.is_private_non_exceeding_threshold) patch.is_private_non_exceeding_threshold = false;

    if (Object.keys(patch).length === 0) return;

    saveSetupPatch(patch);
  }, [
    setup?.company_type,
    setup?.is_public_company,
    setup?.cash_flow_required,
    setup?.ifc_applicable,
    setup?.is_private_exceeding_threshold,
    setup?.is_private_non_exceeding_threshold,
    isPublicCompanyType,
    ifcOverrideActive,
  ]);

  useEffect(() => {
    if (!setup || isPublicCompanyType) return;
    if (!setup.is_public_company) return;
    saveSetupPatch({ is_public_company: false });
  }, [setup?.company_type, setup?.is_public_company, isPublicCompanyType]);

  useEffect(() => {
    if (content?.id) setDraft(content);
  }, [content?.id]);

  useEffect(() => {
    if (!draft) return;
    const shouldClearBasis =
      (draft.basis_for_opinion_is_example || draft.opinion_type === 'unqualified') &&
      (draft.basis_for_opinion?.trim() || draft.basis_for_opinion_is_example);

    if (shouldClearBasis) {
      setDraft((prev) =>
        prev
          ? ({
              ...prev,
              basis_for_opinion: '',
              basis_for_opinion_is_example: false,
            } as AuditReportMainContent)
          : prev
      );
    }

    if (draft.opinion_type === 'unqualified') {
      setEditorBasis('');
      return;
    }

    setEditorBasis(draft.basis_for_opinion || '');
  }, [draft?.id, draft?.opinion_type, draft?.basis_for_opinion, draft?.basis_for_opinion_is_example]);

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
  const generatedPreviewHtml = useMemo(() => buildMainReportPreviewHtml(previewBlocks), [previewBlocks]);

  useEffect(() => {
    if (!previewMode) {
      setPreviewSeeded(false);
      return;
    }
    if (previewSeeded) return;
    const saved = previewDocument?.content_html?.trim();
    setPreviewHtml(saved || generatedPreviewHtml);
    setPreviewSeeded(true);
  }, [previewMode, previewSeeded, previewDocument?.content_html, generatedPreviewHtml]);

  const updateDraft = (patch: Partial<AuditReportMainContent>) => {
    setDraft((prev) => (prev ? ({ ...prev, ...patch } as AuditReportMainContent) : prev));
  };

  const handleOpinionTypeChange = (value: AuditReportMainContent['opinion_type']) => {
    const isSwitchingToUnqualified = value === 'unqualified' && draft?.opinion_type !== 'unqualified';
    if (isSwitchingToUnqualified) {
      setEditorBasis('');
      updateDraft({
        opinion_type: value,
        basis_for_opinion: '',
        basis_for_opinion_is_example: false,
      });
      return;
    }

    updateDraft({ opinion_type: value });
  };

  const ensureBasisForModifiedOpinion = () => {
    if (!draft) return false;
    if (draft.opinion_type !== 'unqualified' && !draft.basis_for_opinion?.trim()) {
      toast.error('Basis for opinion is required for qualified/adverse/disclaimer opinions.');
      setActiveTab('opinion');
      return false;
    }
    return true;
  };

  const openPreview = () => {
    if (!setup?.company_profit_or_loss) {
      toast.error('Select Profit or Loss in Config before previewing the report.');
      setActiveTab('configuration');
      return;
    }
    if (!ensureBasisForModifiedOpinion()) return;
    setPreviewMode(true);
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!ensureBasisForModifiedOpinion()) return;
    setSaving(true);
    const saved = await saveContent(draft);
    setSaving(false);
    if (saved) toast.success('Main report saved');
  };

  const savePreview = async () => {
    const html = previewHtml.trim();
    if (!html) {
      toast.error('Preview is empty.');
      return;
    }
    const saved = await savePreviewDocument(html, MAIN_REPORT_PREVIEW_TITLE);
    if (saved) toast.success('Preview saved');
  };

  const resetPreview = () => {
    setPreviewHtml(generatedPreviewHtml);
  };

  const saveSetupPatch = async (patch: Record<string, any>) => {
    setSaving(true);
    const saved = await saveSetup(patch);
    setSaving(false);
    if (saved) {
      toast.success('Configuration saved');
      if (
        onSetupRefresh &&
        (Object.prototype.hasOwnProperty.call(patch, 'ifc_applicable') ||
          Object.prototype.hasOwnProperty.call(patch, 'company_profit_or_loss'))
      ) {
        onSetupRefresh();
      }
    }
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
            Loading report editor...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (previewMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Generated from current configuration and saved content</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(false)}>
                Back to Edit
              </Button>
              <Button variant="outline" onClick={resetPreview}>
                Reset to Template
              </Button>
              <Button onClick={savePreview} disabled={previewSaving}>
                {previewSaving ? 'Saving...' : 'Save Preview'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <style>{REPORT_PREVIEW_STYLES}</style>
          <RichTextEditor value={previewHtml} onChange={setPreviewHtml} className="report-preview" />
          <p className="mt-2 text-xs text-muted-foreground">
            Edits in this preview are used for exports.
          </p>
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
            <Button variant="outline" onClick={openPreview} className="gap-2" disabled={!hasProfitOrLoss}>
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (!hasProfitOrLoss && value !== 'configuration') {
              toast.error('Select Profit or Loss in Config before continuing.');
              return;
            }
            setActiveTab(value);
          }}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="configuration">Config</TabsTrigger>
            <TabsTrigger value="opinion">Opinion</TabsTrigger>
            <TabsTrigger value="optional" className="text-[11px] px-1">{optionalTabLabel}</TabsTrigger>
            <TabsTrigger value="sa720" className="text-[11px] px-1">Other Info-SA 720</TabsTrigger>
            <TabsTrigger value="s143" className="text-[11px] px-1">143(3)-Co Act</TabsTrigger>
            <TabsTrigger value="rule11" className="text-[11px] px-1">Rule 11-Co Audit Rule</TabsTrigger>
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
                {!hasProfitOrLoss && (
                  <Alert>
                    <AlertDescription>
                      Select Profit or Loss to enable the rest of the configuration.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Company Result for the Year</Label>
                  <ToggleGroup
                    type="single"
                    value={setup.company_profit_or_loss || ''}
                    onValueChange={(value) => {
                      if (!value) return;
                      saveSetupPatch({ company_profit_or_loss: value });
                    }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="profit" aria-label="Profit">
                      Profit
                    </ToggleGroupItem>
                    <ToggleGroupItem value="loss" aria-label="Loss">
                      Loss
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Separator />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Company Classification</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(setup.is_public_company)}
                          disabled={!isPublicCompanyType || configDisabled}
                          onCheckedChange={(v) => updateIfcCriteria({ is_public_company: !!v })}
                        />
                        <Label
                          className={`font-normal ${
                            !isPublicCompanyType || configDisabled ? 'text-muted-foreground' : ''
                          }`}
                        >
                          Public Company
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(setup.is_private_exceeding_threshold)}
                          disabled={isPublicCompanyType || configDisabled}
                          onCheckedChange={(v) => updateIfcCriteria({ is_private_exceeding_threshold: !!v })}
                        />
                        <Label className={`font-normal ${isPublicCompanyType || configDisabled ? 'text-muted-foreground' : ''}`}>
                          Private limited company with Previous year turnover is Rs 50 Crores or more
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(setup.is_private_non_exceeding_threshold)}
                          disabled={isPublicCompanyType || configDisabled}
                          onCheckedChange={(v) => updateIfcCriteria({ is_private_non_exceeding_threshold: !!v })}
                        />
                        <Label className={`font-normal ${isPublicCompanyType || configDisabled ? 'text-muted-foreground' : ''}`}>
                          Private limited company with Current year during at any point of time exceeding Rs 25 Crores
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Reporting Applicability</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(setup.cash_flow_required)}
                          disabled={configDisabled}
                          onCheckedChange={(v) => saveSetupPatch({ cash_flow_required: !!v })}
                        />
                        <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>
                          Cash Flow Statement included
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={Boolean(setup.ifc_applicable)}
                          disabled={configDisabled}
                          onCheckedChange={(v) => {
                            const nextValue = !!v;
                            const override =
                              computedIfcApplicability != null && nextValue !== computedIfcApplicability;
                            setIfcManualOverride(override);
                            saveSetupPatch({ ifc_applicable: nextValue });
                          }}
                        />
                        <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>
                          IFC reporting applicable
                        </Label>
                        {ifcOverrideActive && (
                          <span className="text-xs text-amber-600 font-medium">manual override</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Other Attributes (as applicable)</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-3 md:grid-flow-col">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(setup.is_holding_company)}
                        disabled={configDisabled}
                        onCheckedChange={(v) => updateIfcCriteria({ is_holding_company: !!v })}
                      />
                      <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>is a holding company</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(setup.is_subsidiary)}
                        disabled={configDisabled}
                        onCheckedChange={(v) => updateIfcCriteria({ is_subsidiary: !!v })}
                      />
                      <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>is a subsidiary</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(setup.has_associates)}
                        disabled={configDisabled}
                        onCheckedChange={(v) => saveSetupPatch({ has_associates: !!v })}
                      />
                      <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>has associates</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(setup.has_predecessor_auditor)}
                        disabled={configDisabled}
                        onCheckedChange={(v) => saveSetupPatch({ has_predecessor_auditor: !!v })}
                      />
                      <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>Predecessor auditor</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(setup.has_branch_auditors)}
                        disabled={configDisabled}
                        onCheckedChange={(v) => saveSetupPatch({ has_branch_auditors: !!v })}
                      />
                      <Label className={`font-normal ${configDisabled ? 'text-muted-foreground' : ''}`}>Branch auditors involved</Label>
                    </div>
                  </div>
                </div>

                {setup.has_predecessor_auditor && (
                  <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Predecessor auditor name</Label>
                      <Input
                        value={setup.predecessor_auditor_name || ''}
                        disabled={configDisabled}
                        onChange={(e) => saveSetupPatch({ predecessor_auditor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Predecessor report date</Label>
                      <Input
                        type="date"
                        value={setup.predecessor_report_date || ''}
                        disabled={configDisabled}
                        onChange={(e) => saveSetupPatch({ predecessor_report_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {setup.has_branch_auditors && (
                  <div className="ml-6 space-y-2">
                    <Label>Branch locations</Label>
                    <Textarea
                      value={setup.branch_locations || ''}
                      disabled={configDisabled}
                      onChange={(e) => saveSetupPatch({ branch_locations: e.target.value })}
                      rows={2}
                      placeholder="List branch locations (comma-separated)"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Label>CARO Report Annexure Number</Label>
                      <Input
                        value={setup.caro_annexure_letter || ''}
                        disabled={configDisabled || setup.caro_applicable_status === 'not_applicable'}
                        onChange={(e) => saveSetupPatch({ caro_annexure_letter: e.target.value })}
                        placeholder="A"
                        className="w-24 text-center"
                      />
                    </div>
                    {setup.caro_applicable_status === 'not_applicable' && (
                      <p className="text-xs text-muted-foreground">Disabled because CARO is not applicable.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <Label>IFC Report Annexure Number</Label>
                      <Input
                        value={setup.ifc_annexure_letter || ''}
                        disabled={configDisabled || !setup.ifc_applicable}
                        onChange={(e) => saveSetupPatch({ ifc_annexure_letter: e.target.value })}
                        placeholder="B"
                        className="w-24 text-center"
                      />
                    </div>
                    {!setup.ifc_applicable && (
                      <p className="text-xs text-muted-foreground">Disabled because IFC reporting is not applicable.</p>
                    )}
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
                  onValueChange={(v) => handleOpinionTypeChange(v as AuditReportMainContent['opinion_type'])}
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

            {draft.opinion_type !== 'unqualified' && (
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
                  placeholder="Provide the basis for the modified opinion."
                  required
                />
                <p className="text-xs text-muted-foreground">Required for qualified, adverse, and disclaimer opinions.</p>
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
                <span className="font-semibold">Standards Reference:</span> {standardsReference}
              </p>
            </div>
            
            {KAM_ENABLED && (
              <>
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
              </>
            )}

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
              <div className="md:col-span-2">
                <Label className="text-foreground font-semibold">143(3)(a) Details sought and obtained</Label>
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
                <Label>197(16) - Managerial Remuneration</Label>
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

          {/* 7) Preview */}
          <TabsContent value="preview" className="space-y-4">
            <Button variant="outline" className="w-full" onClick={openPreview}>
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
                  <p className="text-xs text-muted-foreground">(Preview truncated; open full preview.)</p>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

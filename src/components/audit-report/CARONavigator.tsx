import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  FileText, 
  Save,
  ChevronRight,
  Paperclip,
  Eye,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { useCAROClauseLibrary, CAROClause } from '@/hooks/useCAROClauseLibrary';
import { useCAROClauseResponses, CAROClauseResponse } from '@/hooks/useCAROClauseResponses';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuditReportDocument } from '@/hooks/useAuditReportDocument';
import { REPORT_PREVIEW_STYLES } from '@/utils/auditReportPreviewStyles';
import { buildCaroPreviewHtml } from '@/utils/auditReportPreviewHtml';
import {
  CARO_REPORT_PREVIEW_SECTION,
  CARO_REPORT_PREVIEW_TITLE,
} from '@/data/auditReportPreviewSections';

interface CARONavigatorProps {
  engagementId: string;
  caroApplicableStatus: string;
  isStandalone: boolean;
}

export function CARONavigator({ engagementId, caroApplicableStatus, isStandalone }: CARONavigatorProps) {
  const { clauses, loading: clausesLoading } = useCAROClauseLibrary();
  const { responses, saveResponse, getResponseForClause, loading: responsesLoading } = useCAROClauseResponses(engagementId);
  const { files: evidenceFiles, uploadFile, deleteFile, getFileUrl } = useEvidenceFiles(engagementId);
  const {
    document: previewDocument,
    saving: previewSaving,
    saveDocument: savePreviewDocument,
  } = useAuditReportDocument(engagementId, CARO_REPORT_PREVIEW_SECTION, CARO_REPORT_PREVIEW_TITLE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [conclusionText, setConclusionText] = useState('');
  const [isApplicable, setIsApplicable] = useState(true);
  const [naReason, setNaReason] = useState('');
  const [wpRefs, setWpRefs] = useState<string[]>([]);
  const [legacyWpRefs, setLegacyWpRefs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSeeded, setPreviewSeeded] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Filter clauses based on CARO applicability
  const applicableClauses = clauses.filter(clause => {
    if (caroApplicableStatus === 'not_applicable') return false;
    if (caroApplicableStatus === 'cfs_only_xxi' && clause.clause_id !== '3(xxi)') return false;
    return true;
  });

  const generatedPreviewHtml = useMemo(
    () => buildCaroPreviewHtml({ responses, clauses: applicableClauses }),
    [responses, applicableClauses]
  );

  const completedResponses = responses.filter(r => 
    applicableClauses.some(c => c.clause_id === r.clause_id) && 
    (r.status === 'final' || r.status === 'ready_for_review' || r.status === 'in_progress')
  );

  const selectedClause = clauses.find(c => c.clause_id === selectedClauseId);
  const evidenceOptions = useMemo(
    () => evidenceFiles.map((file) => ({ label: file.name, value: file.id })),
    [evidenceFiles]
  );

  const handleSelectClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    const response = getResponseForClause(clauseId);
    const clause = clauses.find(c => c.clause_id === clauseId);
    
    if (response) {
      setCurrentAnswers(response.answers || {});
      setConclusionText(response.conclusion_text || '');
      setIsApplicable(response.is_applicable ?? true);
      setNaReason(response.na_reason || '');
      let nextRefs: string[] = [];
      if (Array.isArray(response.working_paper_refs)) {
        nextRefs = response.working_paper_refs.map(String);
      } else if (typeof response.working_paper_refs === 'string') {
        nextRefs = response.working_paper_refs.split(',').map((ref) => ref.trim()).filter(Boolean);
      }
      const availableIds = new Set(evidenceFiles.map((file) => file.id));
      setWpRefs(nextRefs.filter((ref) => availableIds.has(ref)));
      setLegacyWpRefs(nextRefs.filter((ref) => !availableIds.has(ref)));
    } else {
      // Default all questions to 'yes' (happy path)
      const questions = Array.isArray(clause?.questions) ? clause.questions : [];
      const defaultAnswers: Record<string, any> = {};
      questions.forEach((q: any) => {
        if (q.type === 'yes_no_na') {
          defaultAnswers[q.id] = 'yes';
        }
      });
      setCurrentAnswers(defaultAnswers);

      setConclusionText('');
      setIsApplicable(true);
      setNaReason('');
      setWpRefs([]);
      setLegacyWpRefs([]);
    }
  };

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

  const handleAnswerChange = (questionId: string, value: any) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const selectedEvidenceFiles = useMemo(
    () => wpRefs.map((id) => evidenceFiles.find((file) => file.id === id)).filter(Boolean) as EvidenceFile[],
    [wpRefs, evidenceFiles]
  );

  const missingEvidenceRefs = useMemo(
    () => wpRefs.filter((id) => !evidenceFiles.some((file) => file.id === id)),
    [wpRefs, evidenceFiles]
  );

  useEffect(() => {
    if (legacyWpRefs.length === 0 || evidenceFiles.length === 0) return;
    const availableIds = new Set(evidenceFiles.map((file) => file.id));
    const resolved = legacyWpRefs.filter((ref) => availableIds.has(ref));
    if (resolved.length === 0) return;
    setLegacyWpRefs((prev) => prev.filter((ref) => !availableIds.has(ref)));
    setWpRefs((prev) => {
      const next = [...prev];
      resolved.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });
  }, [legacyWpRefs, evidenceFiles]);

  const handleAttachEvidence = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;

    setUploadingEvidence(true);
    try {
      for (const file of selected) {
        const uploaded = await uploadFile(file, {
          name: file.name,
          file_type: 'document',
          workpaper_ref: selectedClauseId ? `CARO ${selectedClauseId}` : undefined,
        });
        if (uploaded?.id) {
          setWpRefs((prev) => (prev.includes(uploaded.id) ? prev : [...prev, uploaded.id]));
        }
      }
    } finally {
      setUploadingEvidence(false);
      event.target.value = '';
    }
  };

  const handleViewEvidence = async (file: EvidenceFile) => {
    const url = await getFileUrl(file);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Unable to preview this file.');
    }
  };

  const handleDeleteEvidence = async (file: EvidenceFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    await deleteFile(file);
    setWpRefs((prev) => prev.filter((id) => id !== file.id));
  };

  const handleSave = async () => {
    if (!selectedClauseId) return;
    setSaving(true);

    try {
      await saveResponse(selectedClauseId, {
        is_applicable: isApplicable,
        na_reason: !isApplicable ? naReason : null,
        answers: currentAnswers,
        conclusion_text: conclusionText,
        working_paper_refs: [...legacyWpRefs, ...wpRefs],
        status: 'in_progress',
      });
      toast.success('Response saved');
    } catch (error) {
      toast.error('Failed to save response');
    } finally {
      setSaving(false);
    }
  };

  const savePreview = async () => {
    const html = previewHtml.trim();
    if (!html) {
      toast.error('Preview is empty.');
      return;
    }
    const saved = await savePreviewDocument(html, CARO_REPORT_PREVIEW_TITLE);
    if (saved) toast.success('Preview saved');
  };

  const resetPreview = () => {
    setPreviewHtml(generatedPreviewHtml);
  };

  const getClauseStatus = (clauseId: string): 'not_started' | 'in_progress' | 'ready_for_review' | 'final' => {
    const response = getResponseForClause(clauseId);
    if (!response) return 'not_started';
    return response.status as any;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'final':
      case 'ready_for_review':
      case 'in_progress':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'final':
      case 'ready_for_review':
      case 'in_progress':
        return 'border-l-4 border-l-green-500 bg-green-50';
      default:
        return 'border-l-4 border-l-red-500 bg-red-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'final':
        return <Badge className="bg-success text-success-foreground">Final</Badge>;
      case 'ready_for_review':
        return <Badge variant="secondary">Ready for Review</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  if (caroApplicableStatus === 'not_applicable') {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">CARO 2020 Not Applicable</h3>
          <p className="text-muted-foreground">
            Based on the setup, CARO 2020 does not apply to this engagement.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (clausesLoading || responsesLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Loading CARO clauses...</p>
        </CardContent>
      </Card>
    );
  }

  // Preview Mode
  if (previewMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>CARO 2020 Report Preview</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(false)}>
                Back to Editor
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
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Left Panel - Clause List */}
      <Card className="col-span-4 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg">CARO 2020 Clauses</CardTitle>
          <CardDescription>
            {caroApplicableStatus === 'cfs_only_xxi' 
              ? 'Only Clause 3(xxi) applies to CFS' 
              : `${completedResponses.length}/${applicableClauses.length} completed`}
          </CardDescription>
          <Button 
            size="sm" 
            onClick={() => setPreviewMode(true)} 
            className="gap-2 w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </CardHeader>
        <div className="flex-1 overflow-hidden px-4 pb-4">
          <ScrollArea className="h-full">
            <div className="space-y-1 pr-4">
              {applicableClauses.map((clause) => {
                const status = getClauseStatus(clause.clause_id);
                const isSelected = selectedClauseId === clause.clause_id;
                
                return (
                  <button
                    key={clause.id}
                    onClick={() => handleSelectClause(clause.clause_id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors',
                      isSelected 
                        ? 'bg-primary text-primary-foreground' 
                        : getStatusColor(status),
                      !isSelected && 'hover:opacity-80'
                    )}
                  >
                    {getStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-medium text-sm truncate',
                        isSelected && 'text-primary-foreground'
                      )}>
                        {clause.clause_id}
                      </p>
                      <p className={cn(
                        'text-xs truncate',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {clause.clause_title}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      'h-4 w-4 shrink-0',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )} />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </Card>

      {/* Right Panel - Questionnaire */}
      <Card className="col-span-8">
        {selectedClause ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Clause {selectedClause.clause_id}
                    {getStatusBadge(getClauseStatus(selectedClause.clause_id))}
                  </CardTitle>
                  <CardDescription>{selectedClause.clause_title}</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-80px)]">
              <CardContent className="space-y-6">
                {/* Applicability */}
                <div className="space-y-3">
                  <Label>Is this clause applicable?</Label>
                  <RadioGroup
                    value={isApplicable ? 'yes' : 'no'}
                    onValueChange={(v) => setIsApplicable(v === 'yes')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="applicable_yes" />
                      <Label htmlFor="applicable_yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="applicable_no" />
                      <Label htmlFor="applicable_no" className="font-normal">Not Applicable</Label>
                    </div>
                  </RadioGroup>
                  {!isApplicable && (
                    <Textarea
                      placeholder="Reason for not applicable..."
                      value={naReason}
                      onChange={(e) => setNaReason(e.target.value)}
                      rows={2}
                    />
                  )}
                </div>

                {isApplicable && (
                  <>
                    <Separator />

                    {/* Questions */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Questionnaire</Label>
                      {Array.isArray(selectedClause.questions) && selectedClause.questions.map((question: any, idx: number) => (
                        <div key={question.id || idx} className="space-y-2 p-4 bg-muted rounded-lg">
                          <Label className="font-medium">{question.text}</Label>
                          {question.type === 'yes_no_na' && (
                            <RadioGroup
                              value={currentAnswers[question.id] || ''}
                              onValueChange={(v) => handleAnswerChange(question.id, v)}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`${question.id}_yes`} />
                                <Label htmlFor={`${question.id}_yes`} className="font-normal">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`${question.id}_no`} />
                                <Label htmlFor={`${question.id}_no`} className="font-normal">No</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="na" id={`${question.id}_na`} />
                                <Label htmlFor={`${question.id}_na`} className="font-normal">N/A</Label>
                              </div>
                            </RadioGroup>
                          )}
                          {question.type === 'text' && (
                            <Textarea
                              value={currentAnswers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              rows={2}
                            />
                          )}
                          {question.type === 'number' && (
                            <Input
                              type="number"
                              value={currentAnswers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Working Paper References */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Working Paper References
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleAttachEvidence}
                            className="hidden"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingEvidence}
                          >
                            <UploadCloud className="h-4 w-4 mr-2" />
                            {uploadingEvidence ? 'Attaching...' : 'Attach document'}
                          </Button>
                        </div>
                      </div>
                      <MultiSelect
                        options={evidenceOptions}
                        selected={wpRefs}
                        onChange={setWpRefs}
                        placeholder="Select documents from Evidence Vault"
                      />
                      {legacyWpRefs.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Legacy references: {legacyWpRefs.join(', ')}
                        </div>
                      )}
                      {missingEvidenceRefs.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Some linked documents are missing in the Evidence Vault.
                        </p>
                      )}
                      {selectedEvidenceFiles.length > 0 ? (
                        <div className="space-y-2">
                          {selectedEvidenceFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewEvidence(file)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteEvidence(file)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No documents linked yet.</p>
                      )}
                    </div>

                    <Separator />

                    {/* Conclusion */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Conclusion</Label>
                      <Textarea
                        value={conclusionText}
                        onChange={(e) => setConclusionText(e.target.value)}
                        rows={4}
                        placeholder="Enter the conclusion for this clause..."
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </ScrollArea>
          </>
        ) : (
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a clause from the list to begin</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

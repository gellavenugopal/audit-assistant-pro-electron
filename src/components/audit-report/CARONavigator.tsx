import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  FileText, 
  Save,
  ChevronRight,
  Clock,
  User,
  Paperclip
} from 'lucide-react';
import { useCAROClauseLibrary, CAROClause } from '@/hooks/useCAROClauseLibrary';
import { useCAROClauseResponses, CAROClauseResponse } from '@/hooks/useCAROClauseResponses';
import { useCAROStandardAnswers } from '@/hooks/useCAROStandardAnswers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CARONavigatorProps {
  engagementId: string;
  caroApplicableStatus: string;
  isStandalone: boolean;
}

export function CARONavigator({ engagementId, caroApplicableStatus, isStandalone }: CARONavigatorProps) {
  const { clauses, loading: clausesLoading } = useCAROClauseLibrary();
  const { responses, saveResponse, getResponseForClause, loading: responsesLoading } = useCAROClauseResponses(engagementId);
  const { getWording } = useCAROStandardAnswers();
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [conclusionText, setConclusionText] = useState('');
  const [isApplicable, setIsApplicable] = useState(true);
  const [naReason, setNaReason] = useState('');
  const [wpRefs, setWpRefs] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter clauses based on CARO applicability
  const applicableClauses = clauses.filter(clause => {
    if (caroApplicableStatus === 'not_applicable') return false;
    if (caroApplicableStatus === 'cfs_only_xxi' && clause.clause_id !== '3(xxi)') return false;
    return true;
  });

  const completedResponses = responses.filter(r => 
    applicableClauses.some(c => c.clause_id === r.clause_id) && 
    (r.status === 'final' || r.status === 'ready_for_review' || r.status === 'in_progress')
  );

  const selectedClause = clauses.find(c => c.clause_id === selectedClauseId);
  const selectedResponse = selectedClauseId ? getResponseForClause(selectedClauseId) : null;

  const handleSelectClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    const response = getResponseForClause(clauseId);
    const clause = clauses.find(c => c.clause_id === clauseId);
    
    if (response) {
      setCurrentAnswers(response.answers || {});
      setConclusionText(response.conclusion_text || '');
      setIsApplicable(response.is_applicable);
      setNaReason(response.na_reason || '');
      setWpRefs(Array.isArray(response.working_paper_refs) ? response.working_paper_refs.join(', ') : '');
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
      
      // Auto-generate positive conclusion from template
      const defaultConclusion = clause?.positive_wording || '';
      setConclusionText(defaultConclusion);
      
      setIsApplicable(true);
      setNaReason('');
      setWpRefs('');
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const generateConclusion = () => {
    if (!selectedClause) return;
    
    // Check if all questions answered positively/negatively
    const questions = Array.isArray(selectedClause.questions) ? selectedClause.questions : [];
    const allPositive = questions.every((q: any) => currentAnswers[q.id] === 'yes');
    
    // Get wording from custom standard answers or fall back to library defaults
    if (!isApplicable) {
      const naText = getWording(selectedClause.clause_id, 'na', clauses);
      setConclusionText(naText || `Clause ${selectedClause.clause_id} is not applicable to the company.`);
    } else if (allPositive) {
      const positiveText = getWording(selectedClause.clause_id, 'positive', clauses);
      setConclusionText(positiveText || '');
    } else {
      const negativeText = getWording(selectedClause.clause_id, 'negative', clauses);
      setConclusionText(negativeText || '');
    }
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
        working_paper_refs: wpRefs.split(',').map(r => r.trim()).filter(Boolean),
        status: 'in_progress',
      });
      toast.success('Response saved');
    } catch (error) {
      toast.error('Failed to save response');
    } finally {
      setSaving(false);
    }
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
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Working Paper References
                      </Label>
                      <Input
                        value={wpRefs}
                        onChange={(e) => setWpRefs(e.target.value)}
                        placeholder="E.g., WP-FA-001, WP-FA-002 (comma separated)"
                      />
                    </div>

                    <Separator />

                    {/* Conclusion */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Conclusion</Label>
                        <Button variant="outline" size="sm" onClick={generateConclusion}>
                          Generate from Template
                        </Button>
                      </div>
                      <Textarea
                        value={conclusionText}
                        onChange={(e) => setConclusionText(e.target.value)}
                        rows={4}
                        placeholder="Enter the conclusion for this clause..."
                      />
                    </div>

                    {/* Evidence Checklist */}
                    {Array.isArray(selectedClause.evidence_checklist) && selectedClause.evidence_checklist.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Evidence Checklist</Label>
                          <Alert>
                            <FileText className="h-4 w-4" />
                            <AlertDescription>
                              Ensure the following evidence is documented:
                              <ul className="list-disc list-inside mt-2">
                                {selectedClause.evidence_checklist.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm">{item}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </>
                    )}
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

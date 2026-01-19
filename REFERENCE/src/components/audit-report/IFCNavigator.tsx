import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Save,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useIFCClauseLibrary } from '@/hooks/useIFCClauseLibrary';
import { useIFCControlResponses } from '@/hooks/useIFCControlResponses';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IFCNavigatorProps {
  engagementId: string;
}

export function IFCNavigator({ engagementId }: IFCNavigatorProps) {
  const { clauses, loading: clausesLoading } = useIFCClauseLibrary();
  const {
    responses,
    saveResponse,
    getResponseForClause,
    getCompletionStats,
    loading: responsesLoading,
  } = useIFCControlResponses(engagementId);

  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [isApplicable, setIsApplicable] = useState(true);
  const [naReason, setNaReason] = useState('');
  const [designEffectiveness, setDesignEffectiveness] = useState('');
  const [operatingEffectiveness, setOperatingEffectiveness] = useState('');
  const [testingResults, setTestingResults] = useState('');
  const [conclusionText, setConclusionText] = useState('');
  const [exceptionsText, setExceptionsText] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedClause = clauses.find((c) => c.clause_id === selectedClauseId);
  const currentResponse = selectedClauseId ? getResponseForClause(selectedClauseId) : null;
  const stats = getCompletionStats();

  // Load response data when clause is selected
  const handleClauseSelect = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    const response = getResponseForClause(clauseId);
    
    if (response) {
      setIsApplicable(response.is_applicable);
      setNaReason(response.na_reason || '');
      setDesignEffectiveness(response.design_effectiveness || '');
      setOperatingEffectiveness(response.operating_effectiveness || '');
      setTestingResults(response.testing_results || '');
      setConclusionText(response.conclusion_text || '');
      setExceptionsText(response.exceptions_text || '');
    } else {
      setIsApplicable(true);
      setNaReason('');
      setDesignEffectiveness('');
      setOperatingEffectiveness('');
      setTestingResults('');
      setConclusionText('');
      setExceptionsText('');
    }
  };

  const handleSave = async () => {
    if (!selectedClauseId) return;

    setSaving(true);
    const success = await saveResponse(selectedClauseId, {
      is_applicable: isApplicable,
      na_reason: isApplicable ? null : naReason,
      design_effectiveness: isApplicable ? designEffectiveness : null,
      operating_effectiveness: isApplicable ? operatingEffectiveness : null,
      testing_results: isApplicable ? testingResults : null,
      conclusion_text: conclusionText,
      exceptions_text: exceptionsText,
      status: 'completed',
    });
    setSaving(false);

    if (success) {
      // Auto-select next clause
      const currentIndex = clauses.findIndex((c) => c.clause_id === selectedClauseId);
      if (currentIndex < clauses.length - 1) {
        handleClauseSelect(clauses[currentIndex + 1].clause_id);
      }
    }
  };

  const getClauseStatus = (clauseId: string) => {
    const response = getResponseForClause(clauseId);
    if (!response) return 'not_started';
    return response.status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Circle className="h-4 w-4 text-warning fill-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (clausesLoading || responsesLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">Loading IFC controls...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Clause List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IFC Controls
              </CardTitle>
              <CardDescription>Internal Financial Controls</CardDescription>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{stats.completionPercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stats.completed} completed</span>
                <span>{stats.total} total</span>
              </div>
            </div>
          )}
        </CardHeader>
        <ScrollArea className="h-[600px]">
          <CardContent className="space-y-1 pt-0">
            {clauses.map((clause) => {
              const status = getClauseStatus(clause.clause_id);
              const isSelected = selectedClauseId === clause.clause_id;

              return (
                <button
                  key={clause.id}
                  onClick={() => handleClauseSelect(clause.clause_id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted border-transparent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {clause.clause_id}
                        </span>
                        {clause.category && (
                          <Badge variant="outline" className="text-xs">
                            {clause.category}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1">{clause.clause_title}</p>
                    </div>
                    {isSelected && <ChevronRight className="h-4 w-4 text-primary mt-1" />}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Right Panel - Control Assessment Form */}
      <Card className="lg:col-span-2">
        {selectedClause ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-sm">
                      {selectedClause.clause_id}
                    </span>
                    {selectedClause.clause_title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {selectedClause.clause_description}
                  </CardDescription>
                </div>
                {currentResponse && (
                  <Badge
                    variant={
                      currentResponse.status === 'completed'
                        ? 'default'
                        : currentResponse.status === 'in_progress'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {currentResponse.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <ScrollArea className="h-[600px]">
              <CardContent className="space-y-6">
                {/* Control Objective */}
                {selectedClause.control_objective && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Control Objective:</strong> {selectedClause.control_objective}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Applicability */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Applicability</Label>
                  <RadioGroup
                    value={isApplicable ? 'yes' : 'no'}
                    onValueChange={(v) => setIsApplicable(v === 'yes')}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="applicable-yes" />
                      <Label htmlFor="applicable-yes" className="font-normal cursor-pointer">
                        Applicable
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="applicable-no" />
                      <Label htmlFor="applicable-no" className="font-normal cursor-pointer">
                        Not Applicable
                      </Label>
                    </div>
                  </RadioGroup>

                  {!isApplicable && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="na-reason">Reason for N/A</Label>
                      <Textarea
                        id="na-reason"
                        value={naReason}
                        onChange={(e) => setNaReason(e.target.value)}
                        placeholder="Explain why this control is not applicable..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {isApplicable && (
                  <>
                    <Separator />

                    {/* Design Effectiveness */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Design Effectiveness</Label>
                      <RadioGroup
                        value={designEffectiveness}
                        onValueChange={setDesignEffectiveness}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="effective" id="design-effective" />
                          <Label
                            htmlFor="design-effective"
                            className="font-normal cursor-pointer"
                          >
                            Effective
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="ineffective" id="design-ineffective" />
                          <Label
                            htmlFor="design-ineffective"
                            className="font-normal cursor-pointer"
                          >
                            Ineffective
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="not_tested" id="design-not-tested" />
                          <Label
                            htmlFor="design-not-tested"
                            className="font-normal cursor-pointer"
                          >
                            Not Tested
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Operating Effectiveness */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Operating Effectiveness</Label>
                      <RadioGroup
                        value={operatingEffectiveness}
                        onValueChange={setOperatingEffectiveness}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="effective" id="operating-effective" />
                          <Label
                            htmlFor="operating-effective"
                            className="font-normal cursor-pointer"
                          >
                            Effective
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="ineffective" id="operating-ineffective" />
                          <Label
                            htmlFor="operating-ineffective"
                            className="font-normal cursor-pointer"
                          >
                            Ineffective
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="not_tested" id="operating-not-tested" />
                          <Label
                            htmlFor="operating-not-tested"
                            className="font-normal cursor-pointer"
                          >
                            Not Tested
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Testing Results */}
                    <div className="space-y-2">
                      <Label htmlFor="testing-results" className="text-base font-semibold">
                        Testing Procedures & Results
                      </Label>
                      <Textarea
                        id="testing-results"
                        value={testingResults}
                        onChange={(e) => setTestingResults(e.target.value)}
                        placeholder="Describe testing procedures performed and results obtained..."
                        rows={5}
                      />
                    </div>

                    <Separator />

                    {/* Exceptions */}
                    <div className="space-y-2">
                      <Label htmlFor="exceptions" className="text-base font-semibold">
                        Exceptions / Control Deficiencies
                      </Label>
                      <Textarea
                        id="exceptions"
                        value={exceptionsText}
                        onChange={(e) => setExceptionsText(e.target.value)}
                        placeholder="Document any exceptions, control deficiencies, or weaknesses identified..."
                        rows={4}
                      />
                    </div>

                    <Separator />
                  </>
                )}

                {/* Conclusion */}
                <div className="space-y-2">
                  <Label htmlFor="conclusion" className="text-base font-semibold">
                    Conclusion
                  </Label>
                  <Textarea
                    id="conclusion"
                    value={conclusionText}
                    onChange={(e) => setConclusionText(e.target.value)}
                    placeholder="State your overall conclusion on this control..."
                    rows={4}
                  />
                </div>

                <Separator />

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save & Continue'}
                  </Button>
                </div>
              </CardContent>
            </ScrollArea>
          </>
        ) : (
          <CardContent className="py-20 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Select a Control</p>
            <p className="text-sm text-muted-foreground mt-2">
              Choose a control from the left panel to begin assessment
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

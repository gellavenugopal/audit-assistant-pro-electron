import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useCAROClauseLibrary, CAROClause } from '@/hooks/useCAROClauseLibrary';
import { useCAROStandardAnswers } from '@/hooks/useCAROStandardAnswers';

interface ClauseEditorProps {
  clause: CAROClause;
  customAnswer: {
    positive_wording: string | null;
    negative_wording: string | null;
    na_wording: string | null;
  } | null;
  onSave: (positive: string | null, negative: string | null, na: string | null) => Promise<void>;
  onReset: () => Promise<void>;
}

const ClauseEditor: React.FC<ClauseEditorProps> = ({ clause, customAnswer, onSave, onReset }) => {
  const [positiveWording, setPositiveWording] = useState(customAnswer?.positive_wording || '');
  const [negativeWording, setNegativeWording] = useState(customAnswer?.negative_wording || '');
  const [naWording, setNaWording] = useState(customAnswer?.na_wording || '');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const hasChanges = customAnswer
    ? (
        positiveWording !== (customAnswer.positive_wording || '') ||
        negativeWording !== (customAnswer.negative_wording || '') ||
        naWording !== (customAnswer.na_wording || '')
      )
    : (
        positiveWording !== '' ||
        negativeWording !== '' ||
        naWording !== ''
      );

  const handleSave = async () => {
    setSaving(true);
    await onSave(
      positiveWording || null,
      negativeWording || null,
      naWording || null
    );
    setSaving(false);
  };

  const handleReset = async () => {
    setResetting(true);
    await onReset();
    setPositiveWording('');
    setNegativeWording('');
    setNaWording('');
    setResetting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {customAnswer && (
            <Badge variant="secondary" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Customized
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {customAnswer && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Reset to Default
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Badge className="bg-green-500/10 text-green-600 border-green-200">YES</Badge>
            Positive Response (Applicable - No Exceptions)
          </Label>
          <Textarea
            value={positiveWording}
            onChange={(e) => setPositiveWording(e.target.value)}
            className="mt-2 min-h-[100px]"
            placeholder="Enter the standard response when the clause is applicable with no exceptions..."
          />
        </div>

        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Badge className="bg-red-500/10 text-red-600 border-red-200">NO</Badge>
            Negative Response (Applicable - Has Exceptions)
          </Label>
          <Textarea
            value={negativeWording}
            onChange={(e) => setNegativeWording(e.target.value)}
            className="mt-2 min-h-[100px]"
            placeholder="Enter the standard response when exceptions are found..."
          />
        </div>

        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">N/A</Badge>
            Not Applicable Response
          </Label>
          <Textarea
            value={naWording}
            onChange={(e) => setNaWording(e.target.value)}
            className="mt-2 min-h-[100px]"
            placeholder="Enter the standard response when the clause is not applicable..."
          />
        </div>
      </div>
    </div>
  );
};

export const CAROTemplatesTab: React.FC = () => {
  const { clauses, loading: clausesLoading } = useCAROClauseLibrary();
  const { standardAnswers, loading: answersLoading, saveStandardAnswer, resetToDefault, getCustomAnswer } = useCAROStandardAnswers();

  if (clausesLoading || answersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group clauses by parent clause (e.g., 3(i), 3(ii))
  const getParentClauseId = (clauseId: string): string => {
    const match = clauseId.match(/^3\(([ivx]+)\)/i);
    return match ? `3(${match[1]})` : clauseId;
  };

  const groupedClauses = clauses.reduce<Record<string, CAROClause[]>>((acc, clause) => {
    const parentId = getParentClauseId(clause.clause_id);
    if (!acc[parentId]) {
      acc[parentId] = [];
    }
    acc[parentId].push(clause);
    return acc;
  }, {});

  const parentClauseIds = Object.keys(groupedClauses).sort((a, b) => {
    const romanToNum = (roman: string): number => {
      const match = roman.match(/3\(([ivx]+)\)/i);
      if (!match) return 0;
      const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20, xxi: 21 };
      return romanMap[match[1].toLowerCase()] || 0;
    };
    return romanToNum(a) - romanToNum(b);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>CARO 2020 Standard Answers</CardTitle>
        <CardDescription>
          Configure default wordings for each CARO clause. These templates will be used when generating reports using "Generate from Template".
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Customize the standard responses for YES (no exceptions), NO (with exceptions), and N/A (not applicable) scenarios. 
            Changes here will apply to all future "Generate from Template" operations across all engagements.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {parentClauseIds.map((parentId) => {
            const subClauses = groupedClauses[parentId];
            const firstClause = subClauses[0];
            const parentTitle = firstClause?.clause_title?.split(' - ')[0] || parentId;

            return (
              <AccordionItem key={parentId} value={parentId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{parentId}</Badge>
                    <span className="text-left">{parentTitle}</span>
                    <Badge variant="secondary" className="ml-2">
                      {subClauses.length} sub-clause{subClauses.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    {subClauses.map((clause) => (
                      <div key={clause.id} className="border rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="font-medium text-sm">{clause.clause_id}</h4>
                          <p className="text-sm text-muted-foreground">{clause.clause_title}</p>
                        </div>
                        <ClauseEditor
                          clause={clause}
                          customAnswer={getCustomAnswer(clause.clause_id) || null}
                          onSave={async (positive, negative, na) => {
                            await saveStandardAnswer(clause.clause_id, positive, negative, na);
                          }}
                          onReset={async () => {
                            await resetToDefault(clause.clause_id);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default CAROTemplatesTab;

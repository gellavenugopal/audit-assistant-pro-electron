import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface NoteNumberSummaryProps {
  bsStartingNote: number;
  bsNoteCount: number;
  plStartingNote: number;
  plNoteCount: number;
  includeContingentLiabilities: boolean;
  contingentLiabilityNoteNo?: number;
}

export function NoteNumberSummary({
  bsStartingNote,
  bsNoteCount,
  plStartingNote,
  plNoteCount,
  includeContingentLiabilities,
  contingentLiabilityNoteNo,
}: NoteNumberSummaryProps) {
  const bsEnd = bsStartingNote + bsNoteCount - 1;
  const plEnd = plStartingNote + plNoteCount - 1;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-base text-blue-900">Financial Statement Note Configuration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Balance Sheet Notes */}
          <div className="space-y-2">
            <CardDescription className="text-blue-800 font-semibold">Balance Sheet Notes</CardDescription>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-900 border-blue-300">
                {bsStartingNote} - {bsEnd}
              </Badge>
              <span className="text-sm text-blue-700">({bsNoteCount} notes)</span>
            </div>
          </div>

          {/* P&L Notes */}
          <div className="space-y-2">
            <CardDescription className="text-blue-800 font-semibold">P&L Notes</CardDescription>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-900 border-green-300">
                {plStartingNote} - {plEnd}
              </Badge>
              <span className="text-sm text-blue-700">({plNoteCount} notes)</span>
            </div>
          </div>

          {/* Contingent Liabilities */}
          {includeContingentLiabilities && contingentLiabilityNoteNo && (
            <div className="space-y-2">
              <CardDescription className="text-blue-800 font-semibold">Contingent Liabilities</CardDescription>
              <Badge className="bg-orange-100 text-orange-900 border-orange-300">
                Note {contingentLiabilityNoteNo}
              </Badge>
            </div>
          )}
        </div>

        <p className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-200">
          Note numbers are assigned sequentially only to line items that have values in either period.
        </p>
      </CardContent>
    </Card>
  );
}

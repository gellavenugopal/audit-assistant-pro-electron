import { LedgerRow } from '@/services/trialBalanceNewClassification';
import { FixedAssetsNote } from './FixedAssetsNote';

interface FANotesTabProps {
  data: LedgerRow[];
  reportingScale?: string;
  startingNoteNumber?: number;
}

export function FANotesTab({ data, reportingScale = 'rupees', startingNoteNumber = 1 }: FANotesTabProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No fixed asset data available. Please classify fixed assets in the Classified TB.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Fixed Assets Notes</h3>
        <p className="text-xs text-blue-700">
          Property, Plant and Equipment details with Gross Block, Depreciation and Net Book Value movements.
          Includes additional disclosures for Revaluation, Ageing Schedule and Completion Schedule.
        </p>
      </div>

      <FixedAssetsNote 
        data={data}
        noteNumber={String(startingNoteNumber)}
        reportingScale={reportingScale}
      />
    </div>
  );
}

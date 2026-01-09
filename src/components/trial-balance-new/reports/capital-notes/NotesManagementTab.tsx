import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, User, AlertCircle } from 'lucide-react';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';
import { ProprietorCapitalNote } from './ProprietorCapitalNote';
import { PartnershipCapitalNote } from './PartnershipCapitalNote';
import { CorporateShareCapitalNote } from './CorporateShareCapitalNote';

interface NotesManagementTabProps {
  lines: TrialBalanceLine[];
  constitution: string;
  financialYear: string;
  clientName: string;
}

export function NotesManagementTab({ lines, constitution, financialYear, clientName }: NotesManagementTabProps) {
  // Determine entity type category
  const entityCategory = useMemo(() => {
    switch (constitution) {
      case 'company':
        return 'corporate';
      case 'llp':
        return 'llp';
      case 'partnership':
        return 'partnership';
      case 'proprietorship':
      case 'huf':
        return 'proprietorship';
      default:
        return 'non_corporate';
    }
  }, [constitution]);

  // Parse financial year for display
  const yearInfo = useMemo(() => {
    // Expecting format like "2023-24" or "2023-2024"
    const parts = financialYear?.split('-') || [];
    const startYear = parts[0] || '2024';
    let endYear = parts[1] || '2025';
    if (endYear.length === 2) {
      endYear = startYear.substring(0, 2) + endYear;
    }
    return {
      current: `31 March ${endYear}`,
      previous: `31 March ${startYear}`,
    };
  }, [financialYear]);

  const getEntityLabel = () => {
    switch (constitution) {
      case 'company': return 'Company (Schedule III)';
      case 'llp': return 'Limited Liability Partnership';
      case 'partnership': return 'Partnership Firm';
      case 'proprietorship': return 'Proprietorship';
      case 'huf': return 'Hindu Undivided Family';
      case 'trust': return 'Trust';
      case 'society': return 'Society';
      default: return constitution;
    }
  };

  if (lines.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trial Balance Data</h3>
          <p className="text-muted-foreground">
            Import trial balance data first to manage entity-specific capital notes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entity Info Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {entityCategory === 'corporate' && <Building2 className="h-5 w-5" />}
                {entityCategory === 'partnership' || entityCategory === 'llp' ? <Users className="h-5 w-5" /> : null}
                {entityCategory === 'proprietorship' && <User className="h-5 w-5" />}
                Capital & Equity Notes
              </CardTitle>
              <CardDescription className="mt-1">
                {clientName} • {financialYear}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {getEntityLabel()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Entity-specific content */}
      {entityCategory === 'corporate' && (
        <CorporateShareCapitalNote 
          lines={lines} 
          currentYear={yearInfo.current}
          previousYear={yearInfo.previous}
        />
      )}

      {(entityCategory === 'partnership' || entityCategory === 'llp') && (
        <PartnershipCapitalNote 
          lines={lines} 
          currentYear={yearInfo.current}
          previousYear={yearInfo.previous}
          entityType={entityCategory === 'llp' ? 'llp' : 'partnership'}
        />
      )}

      {entityCategory === 'proprietorship' && (
        <ProprietorCapitalNote 
          lines={lines} 
          currentYear={yearInfo.current}
          previousYear={yearInfo.previous}
        />
      )}

      {entityCategory === 'non_corporate' && constitution !== 'proprietorship' && constitution !== 'huf' && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Notes Template Not Available</h3>
            <p className="text-muted-foreground">
              Capital notes template for {getEntityLabel()} is not yet available.
              Please use the standard Balance Sheet format.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, ClipboardCheck, Settings, Download, AlertTriangle } from 'lucide-react';
import { AuditReportSetup } from '@/components/audit-report/AuditReportSetup';
import { CARONavigator } from '@/components/audit-report/CARONavigator';
import { MainReportEditor } from '@/components/audit-report/MainReportEditor';
import { IFCNavigator } from '@/components/audit-report/IFCNavigator';
import { IFCReportEditor } from '@/components/audit-report/IFCReportEditor';
import { ReportExport } from '@/components/audit-report/ReportExport';
import { useAuditReportSetup } from '@/hooks/useAuditReportSetup';
import { formatFinancialYearAsReportDate } from '@/utils/dateFormatting';
import { UnlockDialog } from '@/components/audit/UnlockDialog';
import { toast } from 'sonner';

export default function AuditReport() {
  const { currentEngagement } = useEngagement();
  const [activeTab, setActiveTab] = useState('setup');
  const { setup, loading, saveSetup, refetch } = useAuditReportSetup(currentEngagement?.id);
  const { user, role } = useAuth();
  const [finalizing, setFinalizing] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const canUnlock = role === 'partner' || role === 'manager';
  const headerChipClass = 'bg-muted/60 border-muted-foreground/30 text-foreground';
  const buttonChipClass = 'h-auto rounded-full px-2.5 py-0.5 text-xs font-semibold border border-muted-foreground/30 bg-muted/60 text-foreground hover:bg-muted/70';

  if (!currentEngagement) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an engagement first.</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!setup) return <Badge variant="outline" className={headerChipClass}>Not Started</Badge>;
    switch (setup.report_status) {
      case 'draft':
        return <Badge variant="outline" className={headerChipClass}>Draft</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className={headerChipClass}>In Progress</Badge>;
      case 'review':
        return <Badge variant="outline" className={headerChipClass}>Under Review</Badge>;
      case 'finalized':
        return <Badge variant="outline" className={headerChipClass}>Finalized</Badge>;
      case 'locked':
        return <Badge variant="outline" className={headerChipClass}>Locked</Badge>;
      default:
        return <Badge variant="outline" className={headerChipClass}>Unknown</Badge>;
    }
  };

  const getCaroStatus = () => {
    if (!setup?.company_type) return null;
    if (setup.is_standalone === false) return 'cfs_only_xxi';
    if (['banking', 'insurance', 'section_8', 'opc', 'small_company'].includes(setup.company_type)) {
      return 'not_applicable';
    }
    if (setup.company_type === 'public_company') return 'applicable';
    if (setup.company_type === 'private_company' && !setup.is_private_company) {
      return 'pending';
    }
    if (setup.is_private_company) {
      const paidUp = setup.paid_up_capital ?? 0;
      const reserves = setup.reserves_surplus ?? 0;
      const borrowings = setup.borrowings_amount ?? 0;
      const totalCapital = paidUp + reserves;
      if (paidUp <= 10000000 && reserves <= 10000000 && borrowings <= 10000000 && totalCapital <= 20000000) {
        return 'not_applicable';
      }
    }
    return setup.caro_applicable_status || 'applicable';
  };

  const caroStatus = getCaroStatus();

  const finalizeReport = async () => {
    if (!setup || !setup.setup_completed) return;
    setFinalizing(true);
    await saveSetup({
      report_status: 'finalized',
      locked: true,
      locked_at: new Date().toISOString(),
      locked_by: user?.id || null,
    });
    setFinalizing(false);
  };

  const unlockReport = async (reason: string) => {
    if (!setup) return;
    if (!canUnlock) {
      toast.error('Only Partner/Manager can unlock');
      return;
    }
    await saveSetup({
      locked: false,
      report_status: 'in_progress',
      unlock_reason: reason,
      unlocked_at: new Date().toISOString(),
      unlocked_by: user?.id || null,
      locked_at: null,
      locked_by: null,
    });
    await refetch();
    toast.success('Report unlocked');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Report</h1>
          <p className="text-muted-foreground">
            {currentEngagement.client_name} - {currentEngagement.financial_year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {caroStatus === 'applicable' && (
            <Badge variant="outline" className={`gap-1 ${headerChipClass}`}>
              <ClipboardCheck className="h-3 w-3" />
              CARO Applicable
            </Badge>
          )}
          {caroStatus === 'cfs_only_xxi' && (
            <Badge variant="outline" className={`gap-1 ${headerChipClass}`}>
              <AlertTriangle className="h-3 w-3" />
              CFS - Clause 3(xxi) Only
            </Badge>
          )}
          {setup && setup.setup_completed && (
            setup.locked ? (
              <Button
                variant="outline"
                onClick={() => setUnlockDialogOpen(true)}
                disabled={!canUnlock}
                className={buttonChipClass}
              >
                Unlock / Undo Finalize
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={finalizeReport}
                disabled={finalizing}
                className={buttonChipClass}
              >
                {finalizing ? 'Finalizing...' : 'Finalize Report'}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup" className="gap-2">
            <Settings className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="main-report" className="gap-2" disabled={!setup?.setup_completed}>
            <FileText className="h-4 w-4" />
            Main Report
          </TabsTrigger>
          <TabsTrigger value="caro" className="gap-2" disabled={!setup?.setup_completed}>
            <ClipboardCheck className="h-4 w-4" />
            CARO 2020
          </TabsTrigger>
          <TabsTrigger value="ifc" className="gap-2" disabled={!setup?.setup_completed || !setup?.ifc_applicable}>
            <FileText className="h-4 w-4" />
            IFC Report
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2" disabled={!setup?.setup_completed}>
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <AuditReportSetup 
            engagementId={currentEngagement.id}
            setup={setup}
            loading={loading}
            saveSetup={saveSetup}
            refetchSetup={refetch}
            onSetupComplete={() => {
              refetch();
              setActiveTab('main-report');
            }}
          />
        </TabsContent>

        <TabsContent value="main-report">
          {setup?.setup_completed ? (
            <MainReportEditor
              engagementId={currentEngagement.id}
              clientName={currentEngagement.client_name}
              financialYear={formatFinancialYearAsReportDate(currentEngagement.financial_year)}
              onSetupRefresh={refetch}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Complete the setup first to access Main Report.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="caro">
          {setup?.setup_completed ? (
            <CARONavigator 
              engagementId={currentEngagement.id}
              caroApplicableStatus={setup.caro_applicable_status}
              isStandalone={setup.is_standalone}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Complete the setup first to access CARO reporting.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ifc">
          {setup?.setup_completed && setup?.ifc_applicable ? (
            <IFCReportEditor
              engagementId={currentEngagement.id}
              clientName={currentEngagement.client_name}
              financialYear={formatFinancialYearAsReportDate(currentEngagement.financial_year)}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  {!setup?.setup_completed 
                    ? 'Complete the setup first to access IFC reporting.'
                    : 'IFC reporting is not applicable for this engagement.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export">
          {setup?.setup_completed ? (
            <ReportExport 
              engagementId={currentEngagement.id}
              setup={setup}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Complete the setup first to export reports.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <UnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        itemName="Audit Report"
        onConfirm={unlockReport}
      />
    </div>
  );
}

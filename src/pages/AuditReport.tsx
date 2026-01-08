import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEngagement } from '@/contexts/EngagementContext';
import { FileText, ClipboardCheck, Settings, Download, AlertTriangle } from 'lucide-react';
import { AuditReportSetup } from '@/components/audit-report/AuditReportSetup';
import { CARONavigator } from '@/components/audit-report/CARONavigator';
import { MainReportEditor } from '@/components/audit-report/MainReportEditor';
import { IFCNavigator } from '@/components/audit-report/IFCNavigator';
import { IFCReportEditor } from '@/components/audit-report/IFCReportEditor';
import { ReportExport } from '@/components/audit-report/ReportExport';
import { useAuditReportSetup } from '@/hooks/useAuditReportSetup';
import { formatFinancialYearAsReportDate } from '@/utils/dateFormatting';

export default function AuditReport() {
  const { currentEngagement } = useEngagement();
  const [activeTab, setActiveTab] = useState('setup');
  const { setup, loading, saveSetup, refetch } = useAuditReportSetup(currentEngagement?.id);

  if (!currentEngagement) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an engagement first.</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!setup) return <Badge variant="outline">Not Started</Badge>;
    switch (setup.report_status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'review':
        return <Badge className="bg-warning text-warning-foreground">Under Review</Badge>;
      case 'finalized':
        return <Badge className="bg-success text-success-foreground">Finalized</Badge>;
      case 'locked':
        return <Badge variant="destructive">Locked</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
          {setup?.caro_applicable_status === 'applicable' && (
            <Badge variant="outline" className="gap-1">
              <ClipboardCheck className="h-3 w-3" />
              CARO Applicable
            </Badge>
          )}
          {setup?.caro_applicable_status === 'cfs_only_xxi' && (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              CFS - Clause 3(xxi) Only
            </Badge>
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
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Trash2, Download, Eye, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface KeyAuditMatter {
  id: string;
  title: string;
  description: string;
  auditResponse: string;
}

interface AuditReportData {
  opinionType: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer';
  reportDate: string;
  financialYearEnd: string;
  entityName: string;
  entityAddress: string;
  auditorName: string;
  auditorFirmName: string;
  auditorMembershipNo: string;
  auditorFirmRegNo: string;
  auditorAddress: string;
  auditorCity: string;
  auditorUDIN: string;
  basisForQualification: string;
  qualifiedMatters: string;
  adverseMatters: string;
  disclaimerMatters: string;
  emphasisOfMatter: string;
  otherMatter: string;
  includeKAM: boolean;
  keyAuditMatters: KeyAuditMatter[];
  goingConcernUncertainty: boolean;
  goingConcernDetails: string;
  comparativeInformation: 'corresponding' | 'comparative';
  otherInformationIncluded: boolean;
  otherInformationDescription: string;
}

const defaultReportData: AuditReportData = {
  opinionType: 'unqualified',
  reportDate: new Date().toISOString().split('T')[0],
  financialYearEnd: '',
  entityName: '',
  entityAddress: '',
  auditorName: '',
  auditorFirmName: '',
  auditorMembershipNo: '',
  auditorFirmRegNo: '',
  auditorAddress: '',
  auditorCity: '',
  auditorUDIN: '',
  basisForQualification: '',
  qualifiedMatters: '',
  adverseMatters: '',
  disclaimerMatters: '',
  emphasisOfMatter: '',
  otherMatter: '',
  includeKAM: false,
  keyAuditMatters: [],
  goingConcernUncertainty: false,
  goingConcernDetails: '',
  comparativeInformation: 'corresponding',
  otherInformationIncluded: false,
  otherInformationDescription: '',
};

interface AuditReportProps {
  engagementName: string;
  clientName: string;
  financialYear: string;
}

export function AuditReport({ engagementName, clientName, financialYear }: AuditReportProps) {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<AuditReportData>({
    ...defaultReportData,
    entityName: clientName,
    financialYearEnd: financialYear,
  });
  const [previewMode, setPreviewMode] = useState(false);

  const updateField = <K extends keyof AuditReportData>(field: K, value: AuditReportData[K]) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const addKeyAuditMatter = () => {
    const newKAM: KeyAuditMatter = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      auditResponse: '',
    };
    updateField('keyAuditMatters', [...reportData.keyAuditMatters, newKAM]);
  };

  const updateKeyAuditMatter = (id: string, field: keyof KeyAuditMatter, value: string) => {
    updateField('keyAuditMatters', reportData.keyAuditMatters.map(kam =>
      kam.id === id ? { ...kam, [field]: value } : kam
    ));
  };

  const removeKeyAuditMatter = (id: string) => {
    updateField('keyAuditMatters', reportData.keyAuditMatters.filter(kam => kam.id !== id));
  };

  const getOpinionIcon = (type: string) => {
    switch (type) {
      case 'unqualified': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'qualified': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'adverse': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'disclaimer': return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
      default: return null;
    }
  };

  const getOpinionBadgeVariant = (type: string) => {
    switch (type) {
      case 'unqualified': return 'default';
      case 'qualified': return 'secondary';
      case 'adverse': return 'destructive';
      case 'disclaimer': return 'outline';
      default: return 'default';
    }
  };

  const generateOpinionParagraph = () => {
    const { opinionType, entityName, financialYearEnd } = reportData;
    
    switch (opinionType) {
      case 'unqualified':
        return `In our opinion and to the best of our information and according to the explanations given to us, the aforesaid standalone financial statements give the information required by the Companies Act, 2013 ("the Act") in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${financialYearEnd}, and its profit/loss and its cash flows for the year ended on that date.`;
      case 'qualified':
        return `In our opinion and to the best of our information and according to the explanations given to us, except for the effects of the matter described in the Basis for Qualified Opinion section of our report, the aforesaid standalone financial statements give the information required by the Act in the manner so required and give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${financialYearEnd}, and its profit/loss and its cash flows for the year ended on that date.`;
      case 'adverse':
        return `In our opinion, because of the significance of the matter discussed in the Basis for Adverse Opinion section of our report, the accompanying financial statements do not give a true and fair view in conformity with the accounting principles generally accepted in India, of the state of affairs of ${entityName} as at ${financialYearEnd}, and its profit/loss and its cash flows for the year ended on that date.`;
      case 'disclaimer':
        return `Because of the significance of the matter described in the Basis for Disclaimer of Opinion section, we have not been able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion. Accordingly, we do not express an opinion on the financial statements.`;
      default:
        return '';
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = 20;

    const addText = (text: string, fontSize: number = 10, bold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      
      const lines = doc.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        let x = margin;
        if (align === 'center') x = pageWidth / 2;
        if (align === 'right') x = pageWidth - margin;
        
        doc.text(line, x, y, { align });
        y += fontSize * 0.5;
      });
      y += 3;
    };

    const addSection = (title: string, content: string) => {
      if (content) {
        addText(title, 11, true);
        addText(content);
        y += 5;
      }
    };

    // Header
    addText('INDEPENDENT AUDITOR\'S REPORT', 14, true, 'center');
    y += 5;
    
    addText(`To the Members of ${reportData.entityName}`, 11, false, 'left');
    y += 5;

    // Report on the Financial Statements
    addText('Report on the Audit of the Standalone Financial Statements', 12, true);
    y += 3;

    // Opinion
    const opinionTitle = reportData.opinionType === 'unqualified' ? 'Opinion' :
      reportData.opinionType === 'qualified' ? 'Qualified Opinion' :
      reportData.opinionType === 'adverse' ? 'Adverse Opinion' : 'Disclaimer of Opinion';
    
    addText(opinionTitle, 11, true);
    addText(generateOpinionParagraph());
    y += 5;

    // Basis for Opinion
    if (reportData.opinionType === 'qualified' && reportData.basisForQualification) {
      addSection('Basis for Qualified Opinion', reportData.basisForQualification);
    }
    if (reportData.opinionType === 'adverse' && reportData.adverseMatters) {
      addSection('Basis for Adverse Opinion', reportData.adverseMatters);
    }
    if (reportData.opinionType === 'disclaimer' && reportData.disclaimerMatters) {
      addSection('Basis for Disclaimer of Opinion', reportData.disclaimerMatters);
    }

    // Going Concern
    if (reportData.goingConcernUncertainty && reportData.goingConcernDetails) {
      addSection('Material Uncertainty Related to Going Concern', reportData.goingConcernDetails);
    }

    // Key Audit Matters
    if (reportData.includeKAM && reportData.keyAuditMatters.length > 0) {
      addText('Key Audit Matters', 11, true);
      addText('Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period.');
      y += 3;
      
      reportData.keyAuditMatters.forEach((kam, index) => {
        addText(`${index + 1}. ${kam.title}`, 10, true);
        addText(`Description: ${kam.description}`);
        addText(`How our audit addressed the matter: ${kam.auditResponse}`);
        y += 3;
      });
    }

    // Emphasis of Matter
    if (reportData.emphasisOfMatter) {
      addSection('Emphasis of Matter', reportData.emphasisOfMatter);
    }

    // Other Matter
    if (reportData.otherMatter) {
      addSection('Other Matter', reportData.otherMatter);
    }

    // Responsibilities
    addText('Management\'s Responsibility for the Financial Statements', 11, true);
    addText('The Company\'s Board of Directors is responsible for the matters stated in section 134(5) of the Companies Act, 2013 with respect to the preparation of these financial statements that give a true and fair view of the financial position, financial performance and cash flows of the Company in accordance with the accounting principles generally accepted in India.');
    y += 5;

    addText('Auditor\'s Responsibility', 11, true);
    addText('Our responsibility is to express an opinion on these financial statements based on our audit. We conducted our audit in accordance with the Standards on Auditing specified under section 143(10) of the Companies Act, 2013.');
    y += 10;

    // Signature
    addText(`For ${reportData.auditorFirmName}`, 10, true, 'right');
    addText('Chartered Accountants', 10, false, 'right');
    addText(`Firm Registration No.: ${reportData.auditorFirmRegNo}`, 10, false, 'right');
    y += 10;
    addText(reportData.auditorName, 10, true, 'right');
    addText('Partner', 10, false, 'right');
    addText(`Membership No.: ${reportData.auditorMembershipNo}`, 10, false, 'right');
    addText(`UDIN: ${reportData.auditorUDIN}`, 10, false, 'right');
    y += 5;
    addText(`Place: ${reportData.auditorCity}`, 10, false, 'right');
    addText(`Date: ${reportData.reportDate}`, 10, false, 'right');

    // Save
    const fileName = `Audit_Report_${reportData.entityName.replace(/[^a-z0-9]/gi, '_')}_${reportData.financialYearEnd}.pdf`;
    doc.save(fileName);

    toast({
      title: 'Report Generated',
      description: `Downloaded ${fileName}`,
    });
  };

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Report Preview</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Back to Edit
            </Button>
            <Button onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            <ScrollArea className="h-[70vh]">
              <div className="space-y-6 max-w-3xl mx-auto font-serif">
                <div className="text-center space-y-2">
                  <h1 className="text-xl font-bold uppercase">Independent Auditor's Report</h1>
                  <p className="text-sm">To the Members of {reportData.entityName}</p>
                </div>

                <Separator />

                <div>
                  <h2 className="font-bold mb-2">Report on the Audit of the Standalone Financial Statements</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {getOpinionIcon(reportData.opinionType)}
                        {reportData.opinionType === 'unqualified' ? 'Opinion' :
                          reportData.opinionType === 'qualified' ? 'Qualified Opinion' :
                          reportData.opinionType === 'adverse' ? 'Adverse Opinion' : 'Disclaimer of Opinion'}
                      </h3>
                      <p className="text-sm mt-2 text-justify leading-relaxed">
                        {generateOpinionParagraph()}
                      </p>
                    </div>

                    {reportData.opinionType === 'qualified' && reportData.basisForQualification && (
                      <div>
                        <h3 className="font-bold">Basis for Qualified Opinion</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.basisForQualification}</p>
                      </div>
                    )}

                    {reportData.opinionType === 'adverse' && reportData.adverseMatters && (
                      <div>
                        <h3 className="font-bold">Basis for Adverse Opinion</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.adverseMatters}</p>
                      </div>
                    )}

                    {reportData.opinionType === 'disclaimer' && reportData.disclaimerMatters && (
                      <div>
                        <h3 className="font-bold">Basis for Disclaimer of Opinion</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.disclaimerMatters}</p>
                      </div>
                    )}

                    {reportData.goingConcernUncertainty && reportData.goingConcernDetails && (
                      <div>
                        <h3 className="font-bold">Material Uncertainty Related to Going Concern</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.goingConcernDetails}</p>
                      </div>
                    )}

                    {reportData.includeKAM && reportData.keyAuditMatters.length > 0 && (
                      <div>
                        <h3 className="font-bold">Key Audit Matters</h3>
                        <p className="text-sm mt-2 mb-4">
                          Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period.
                        </p>
                        <div className="space-y-4">
                          {reportData.keyAuditMatters.map((kam, index) => (
                            <div key={kam.id} className="border-l-2 border-primary pl-4">
                              <h4 className="font-semibold">{index + 1}. {kam.title}</h4>
                              <p className="text-sm mt-1"><strong>Description:</strong> {kam.description}</p>
                              <p className="text-sm mt-1"><strong>How our audit addressed the matter:</strong> {kam.auditResponse}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportData.emphasisOfMatter && (
                      <div>
                        <h3 className="font-bold">Emphasis of Matter</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.emphasisOfMatter}</p>
                      </div>
                    )}

                    {reportData.otherMatter && (
                      <div>
                        <h3 className="font-bold">Other Matter</h3>
                        <p className="text-sm mt-2 text-justify">{reportData.otherMatter}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="text-right space-y-1 text-sm">
                  <p className="font-bold">For {reportData.auditorFirmName}</p>
                  <p>Chartered Accountants</p>
                  <p>Firm Registration No.: {reportData.auditorFirmRegNo}</p>
                  <br />
                  <p className="font-bold">{reportData.auditorName}</p>
                  <p>Partner</p>
                  <p>Membership No.: {reportData.auditorMembershipNo}</p>
                  <p>UDIN: {reportData.auditorUDIN}</p>
                  <br />
                  <p>Place: {reportData.auditorCity}</p>
                  <p>Date: {reportData.reportDate}</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SA 700 - Audit Report
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prepare Independent Auditor's Report as per ICAI Standards
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button onClick={generatePDF} className="gap-2">
            <Download className="h-4 w-4" />
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Opinion Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Type of Opinion</CardTitle>
          <CardDescription>
            Select the type of audit opinion as per SA 700/705/706
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={reportData.opinionType}
            onValueChange={(value) => updateField('opinionType', value as AuditReportData['opinionType'])}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Label
              htmlFor="unqualified"
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                reportData.opinionType === 'unqualified' ? "border-primary bg-primary/5" : "hover:bg-muted"
              )}
            >
              <RadioGroupItem value="unqualified" id="unqualified" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">Unqualified</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Clean opinion - True & Fair view</p>
              </div>
            </Label>

            <Label
              htmlFor="qualified"
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                reportData.opinionType === 'qualified' ? "border-primary bg-primary/5" : "hover:bg-muted"
              )}
            >
              <RadioGroupItem value="qualified" id="qualified" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-medium">Qualified</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Except for specific matters</p>
              </div>
            </Label>

            <Label
              htmlFor="adverse"
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                reportData.opinionType === 'adverse' ? "border-primary bg-primary/5" : "hover:bg-muted"
              )}
            >
              <RadioGroupItem value="adverse" id="adverse" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium">Adverse</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Material & pervasive misstatement</p>
              </div>
            </Label>

            <Label
              htmlFor="disclaimer"
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                reportData.opinionType === 'disclaimer' ? "border-primary bg-primary/5" : "hover:bg-muted"
              )}
            >
              <RadioGroupItem value="disclaimer" id="disclaimer" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Disclaimer</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Unable to obtain evidence</p>
              </div>
            </Label>
          </RadioGroup>

          {/* Basis for Modified Opinion */}
          {reportData.opinionType === 'qualified' && (
            <div className="mt-4 space-y-2">
              <Label>Basis for Qualified Opinion</Label>
              <Textarea
                placeholder="Describe the matter(s) giving rise to the qualification..."
                value={reportData.basisForQualification}
                onChange={(e) => updateField('basisForQualification', e.target.value)}
                rows={4}
              />
            </div>
          )}

          {reportData.opinionType === 'adverse' && (
            <div className="mt-4 space-y-2">
              <Label>Basis for Adverse Opinion</Label>
              <Textarea
                placeholder="Describe the matter(s) giving rise to the adverse opinion..."
                value={reportData.adverseMatters}
                onChange={(e) => updateField('adverseMatters', e.target.value)}
                rows={4}
              />
            </div>
          )}

          {reportData.opinionType === 'disclaimer' && (
            <div className="mt-4 space-y-2">
              <Label>Basis for Disclaimer of Opinion</Label>
              <Textarea
                placeholder="Describe the matter(s) giving rise to the disclaimer..."
                value={reportData.disclaimerMatters}
                onChange={(e) => updateField('disclaimerMatters', e.target.value)}
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={['entity', 'auditor']} className="space-y-4">
        {/* Entity Details */}
        <AccordionItem value="entity" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Entity Details</span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Name</Label>
                <Input
                  value={reportData.entityName}
                  onChange={(e) => updateField('entityName', e.target.value)}
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Financial Year End</Label>
                <Input
                  value={reportData.financialYearEnd}
                  onChange={(e) => updateField('financialYearEnd', e.target.value)}
                  placeholder="31st March 2024"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Registered Address</Label>
                <Textarea
                  value={reportData.entityAddress}
                  onChange={(e) => updateField('entityAddress', e.target.value)}
                  placeholder="Full registered address"
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Auditor Details */}
        <AccordionItem value="auditor" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Auditor Details</span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auditor Name (Partner)</Label>
                <Input
                  value={reportData.auditorName}
                  onChange={(e) => updateField('auditorName', e.target.value)}
                  placeholder="CA Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Membership Number</Label>
                <Input
                  value={reportData.auditorMembershipNo}
                  onChange={(e) => updateField('auditorMembershipNo', e.target.value)}
                  placeholder="e.g., 123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Firm Name</Label>
                <Input
                  value={reportData.auditorFirmName}
                  onChange={(e) => updateField('auditorFirmName', e.target.value)}
                  placeholder="Firm Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Firm Registration Number</Label>
                <Input
                  value={reportData.auditorFirmRegNo}
                  onChange={(e) => updateField('auditorFirmRegNo', e.target.value)}
                  placeholder="e.g., 123456N"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={reportData.auditorCity}
                  onChange={(e) => updateField('auditorCity', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={reportData.reportDate}
                  onChange={(e) => updateField('reportDate', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>UDIN (Unique Document Identification Number)</Label>
                <Input
                  value={reportData.auditorUDIN}
                  onChange={(e) => updateField('auditorUDIN', e.target.value)}
                  placeholder="e.g., 24123456ABCDEF1234"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Key Audit Matters */}
        <AccordionItem value="kam" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Key Audit Matters (SA 701)</span>
              {reportData.includeKAM && (
                <Badge variant="secondary">{reportData.keyAuditMatters.length} matters</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeKAM"
                  checked={reportData.includeKAM}
                  onCheckedChange={(checked) => updateField('includeKAM', checked as boolean)}
                />
                <Label htmlFor="includeKAM" className="cursor-pointer">
                  Include Key Audit Matters section (Required for listed entities)
                </Label>
              </div>

              {reportData.includeKAM && (
                <div className="space-y-4">
                  {reportData.keyAuditMatters.map((kam, index) => (
                    <Card key={kam.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="font-medium">KAM {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeKeyAuditMatter(kam.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Matter Title</Label>
                            <Input
                              value={kam.title}
                              onChange={(e) => updateKeyAuditMatter(kam.id, 'title', e.target.value)}
                              placeholder="e.g., Revenue Recognition"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description of the Matter</Label>
                            <Textarea
                              value={kam.description}
                              onChange={(e) => updateKeyAuditMatter(kam.id, 'description', e.target.value)}
                              placeholder="Why this matter was considered significant..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>How Our Audit Addressed the Matter</Label>
                            <Textarea
                              value={kam.auditResponse}
                              onChange={(e) => updateKeyAuditMatter(kam.id, 'auditResponse', e.target.value)}
                              placeholder="Audit procedures performed..."
                              rows={3}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" onClick={addKeyAuditMatter} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Key Audit Matter
                  </Button>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Going Concern */}
        <AccordionItem value="going-concern" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Going Concern (SA 570)</span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="goingConcern"
                  checked={reportData.goingConcernUncertainty}
                  onCheckedChange={(checked) => updateField('goingConcernUncertainty', checked as boolean)}
                />
                <Label htmlFor="goingConcern" className="cursor-pointer">
                  Material uncertainty related to going concern exists
                </Label>
              </div>

              {reportData.goingConcernUncertainty && (
                <div className="space-y-2">
                  <Label>Going Concern Uncertainty Details</Label>
                  <Textarea
                    value={reportData.goingConcernDetails}
                    onChange={(e) => updateField('goingConcernDetails', e.target.value)}
                    placeholder="Describe the events or conditions..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Emphasis of Matter / Other Matter */}
        <AccordionItem value="emphasis" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Emphasis of Matter / Other Matter (SA 706)</span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Emphasis of Matter</Label>
                <Textarea
                  value={reportData.emphasisOfMatter}
                  onChange={(e) => updateField('emphasisOfMatter', e.target.value)}
                  placeholder="Matter that does not affect the opinion but is important for users' understanding..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Other Matter</Label>
                <Textarea
                  value={reportData.otherMatter}
                  onChange={(e) => updateField('otherMatter', e.target.value)}
                  placeholder="Other matters relevant to users' understanding of the audit..."
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

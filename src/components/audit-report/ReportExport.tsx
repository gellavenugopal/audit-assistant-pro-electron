import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileCheck, 
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { AuditReportSetup } from '@/hooks/useAuditReportSetup';
import { useCAROClauseResponses } from '@/hooks/useCAROClauseResponses';
import { useCAROClauseLibrary } from '@/hooks/useCAROClauseLibrary';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { usePartners } from '@/hooks/usePartners';
import { useKeyAuditMatters } from '@/hooks/useKeyAuditMatters';
import { useEngagement } from '@/contexts/EngagementContext';
import { useAuditReportContent } from '@/hooks/useAuditReportContent';
import { useIFCReportContent } from '@/hooks/useIFCReportContent';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TextRun,
  Header,
  Footer,
  ImageRun,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
} from 'docx';
import caIndiaLogo from '@/assets/ca-india-logo.jpg';
import { WordIcon } from '@/components/icons/WordIcon';
import { PdfIcon } from '@/components/icons/PdfIcon';
import { AuditReportGenerator } from '@/services/auditReportGenerator';
import { useAuditReportDocument } from '@/hooks/useAuditReportDocument';
import { convertHtmlToDocxElements } from '@/utils/htmlToDocx';
import { REPORT_PREVIEW_STYLES } from '@/utils/auditReportPreviewStyles';
import {
  buildCaroPreviewHtml,
  buildIfcPreviewHtml,
  buildMainReportPreviewHtml,
} from '@/utils/auditReportPreviewHtml';
import {
  CARO_REPORT_PREVIEW_SECTION,
  IFC_REPORT_PREVIEW_SECTION,
  MAIN_REPORT_PREVIEW_SECTION,
  CARO_REPORT_PREVIEW_TITLE,
  IFC_REPORT_PREVIEW_TITLE,
  MAIN_REPORT_PREVIEW_TITLE,
} from '@/data/auditReportPreviewSections';

const KAM_ENABLED = false;

interface ReportExportProps {
  engagementId: string;
  setup: AuditReportSetup;
}

export function ReportExport({ engagementId, setup }: ReportExportProps) {
  const { responses } = useCAROClauseResponses(engagementId);
  const { clauses } = useCAROClauseLibrary();
  const { firmSettings } = useFirmSettings();
  const { getPartnerById } = usePartners();
  const { kams } = useKeyAuditMatters(engagementId);
  const { currentEngagement } = useEngagement();
  const { content: mainContent } = useAuditReportContent(engagementId);
  const { content: ifcContent } = useIFCReportContent(engagementId);
  const { document: mainPreviewDoc } = useAuditReportDocument(
    engagementId,
    MAIN_REPORT_PREVIEW_SECTION,
    MAIN_REPORT_PREVIEW_TITLE
  );
  const { document: ifcPreviewDoc } = useAuditReportDocument(
    engagementId,
    IFC_REPORT_PREVIEW_SECTION,
    IFC_REPORT_PREVIEW_TITLE
  );
  const { document: caroPreviewDoc } = useAuditReportDocument(
    engagementId,
    CARO_REPORT_PREVIEW_SECTION,
    CARO_REPORT_PREVIEW_TITLE
  );
  const [generating, setGenerating] = useState(false);

  // Get signing partner details
  const signingPartner = (setup as any).signing_partner_id 
    ? getPartnerById((setup as any).signing_partner_id) 
    : null;

  const reportGenerator = useMemo(() => {
    if (!setup || !mainContent) return null;
    return new AuditReportGenerator({
      setup,
      content: mainContent,
      kams,
      clientName: currentEngagement?.client_name || 'Company Name',
      financialYearLabel: currentEngagement?.financial_year || '2024-25',
      firmSettings: firmSettings || undefined,
      signingPartner: signingPartner || undefined,
    });
  }, [setup, mainContent, kams, currentEngagement?.client_name, currentEngagement?.financial_year, firmSettings, signingPartner]);

  const previewBlocks = useMemo(() => reportGenerator?.generateBlocks() ?? [], [reportGenerator]);
  const generatedMainPreviewHtml = useMemo(
    () => buildMainReportPreviewHtml(previewBlocks),
    [previewBlocks]
  );
  const generatedIfcPreviewHtml = useMemo(
    () =>
      buildIfcPreviewHtml({
        content: ifcContent,
        setup,
        firmSettings,
        signingPartner,
        clientName: currentEngagement?.client_name || 'Company Name',
        financialYear: currentEngagement?.financial_year || '2024-25',
      }),
    [ifcContent, setup, firmSettings, signingPartner, currentEngagement?.client_name, currentEngagement?.financial_year]
  );

  // Build report data from actual settings
  const reportData = {
    entityName: currentEngagement?.client_name || 'Company Name',
    financialYear: currentEngagement?.financial_year || '2024-25',
    auditorFirmName: firmSettings?.firm_name || 'Firm Name',
    auditorFirmRegNo: firmSettings?.firm_registration_no || '',
    auditorName: signingPartner?.name || 'Partner Name',
    auditorMembershipNo: signingPartner?.membership_number || '',
    auditorCity: (setup as any).report_city || '',
    auditorUDIN: (setup as any).udin || '',
    reportDate: (setup as any).report_date || new Date().toISOString().split('T')[0],
  };

  // Calculate completion stats
  const applicableClauses = clauses.filter(clause => {
    if (setup.caro_applicable_status === 'not_applicable') return false;
    if (setup.caro_applicable_status === 'cfs_only_xxi' && clause.clause_id !== '3(xxi)') return false;
    return true;
  });

  const generatedCaroPreviewHtml = useMemo(
    () => buildCaroPreviewHtml({ responses, clauses: applicableClauses }),
    [responses, applicableClauses]
  );

  const resolvedMainPreviewHtml =
    mainPreviewDoc?.content_html?.trim() || (mainContent ? generatedMainPreviewHtml : '');
  const resolvedIfcPreviewHtml = ifcPreviewDoc?.content_html?.trim() || generatedIfcPreviewHtml;
  const resolvedCaroPreviewHtml = caroPreviewDoc?.content_html?.trim() || generatedCaroPreviewHtml;

  const includeIfc = Boolean(setup.ifc_applicable);
  const includeCaro = setup.caro_applicable_status !== 'not_applicable';
  const hasProfitOrLoss = Boolean(setup.company_profit_or_loss);

  const completedResponses = responses.filter(r => r.status === 'final' || r.status === 'ready_for_review' || r.status === 'in_progress');
  const completionPercentage = applicableClauses.length > 0 
    ? Math.round((completedResponses.length / applicableClauses.length) * 100)
    : 0;

  const canExport = hasProfitOrLoss && (completedResponses.length > 0 || setup.caro_applicable_status === 'not_applicable');

  // Check if report details are complete
  const isReportDetailsComplete = signingPartner && (setup as any).report_date && (setup as any).report_city;

  const buildFullReportSections = () => {
    const sections = [resolvedMainPreviewHtml];
    if (includeIfc) sections.push(resolvedIfcPreviewHtml);
    if (includeCaro) sections.push(resolvedCaroPreviewHtml);
    return sections.filter((section) => section && section.trim());
  };

  const renderHtmlToPdf = async (html: string, filename: string) => {
    if (typeof document === 'undefined') {
      toast.error('PDF export is not available in this environment.');
      return;
    }
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '595pt';
    container.innerHTML = `<style>${REPORT_PREVIEW_STYLES}</style>${html}`;
    document.body.appendChild(container);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      await doc.html(container, {
        html2canvas,
        margin: [40, 40, 40, 40],
        autoPaging: 'text',
        width: 515,
        windowWidth: container.scrollWidth,
      });
      doc.save(filename);
    } finally {
      document.body.removeChild(container);
    }
  };

  const buildDocxChildren = (sections: string[]) => {
    const children: Array<Paragraph | Table> = [];
    sections.forEach((section) => {
      if (!section || !section.trim()) return;
      if (children.length) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
      children.push(...convertHtmlToDocxElements(section));
    });
    return children;
  };


  const generateFullAuditReportPDF = async () => {
    setGenerating(true);

    try {
      if (!hasProfitOrLoss) {
        toast.error('Select Profit or Loss before exporting.');
        return;
      }
      const sections = buildFullReportSections();
      if (!sections.length || !resolvedMainPreviewHtml.trim()) {
        toast.error('Main report preview is empty.');
        return;
      }
      const html = sections.join('<div class="page-break"></div>');
      await renderHtmlToPdf(
        html,
        `Audit_Report_${reportData.entityName.replace(/\s+/g, '_')}_FY${reportData.financialYear}.pdf`
      );
      toast.success('Full Audit Report (PDF) generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const generateCAROPDF = async () => {
    setGenerating(true);
    
    try {
      if (!includeCaro) {
        toast.error('CARO is not applicable for this engagement.');
        return;
      }
      const html = resolvedCaroPreviewHtml;
      if (!html.trim()) {
        toast.error('CARO preview is empty.');
        return;
      }
      await renderHtmlToPdf(html, `CARO_2020_Annexure_${engagementId.slice(0, 8)}.pdf`);
      toast.success('CARO Annexure generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const generateFullAuditReportWordLegacy = async () => {
    setGenerating(true);

    try {
      // Fetch logo as ArrayBuffer
      const logoResponse = await fetch(caIndiaLogo);
      const logoBuffer = await logoResponse.arrayBuffer();

      const firmName = firmSettings?.firm_name || 'Firm Name';
      const firmAddress = firmSettings?.address || '';

      // Create header with logo (3.5cm x 3.5cm = ~132 points), firm name, and "Chartered Accountants"
      // Logo is positioned floating so it doesn't affect centered text
      const header = new Header({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: 132, height: 132 },
                type: 'jpg',
                floating: {
                  horizontalPosition: {
                    offset: 0,
                    relative: HorizontalPositionRelativeFrom.MARGIN,
                  },
                  verticalPosition: {
                    offset: 0,
                    relative: VerticalPositionRelativeFrom.PARAGRAPH,
                  },
                  wrap: {
                    type: TextWrappingType.NONE,
                  },
                  behindDocument: false,
                },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: firmName, bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Chartered Accountants', italics: true, size: 22 }),
            ],
          }),
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
            spacing: { after: 200 },
          }),
        ],
      });

      // Create footer with line and address
      const footer = new Footer({
        children: [
          new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
            spacing: { before: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: firmAddress, size: 18 }),
            ],
          }),
        ],
      });

      // Build document sections
      const children: Paragraph[] = [];

      // Title
      children.push(
        new Paragraph({
          text: "INDEPENDENT AUDITOR'S REPORT",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `TO THE MEMBERS OF ${reportData.entityName}`, bold: true })],
          spacing: { after: 400 },
        })
      );

      // Report on Audit of Standalone FS
      children.push(
        new Paragraph({
          text: 'Report on the Audit of the Standalone Financial Statements',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        })
      );

      // Opinion
      children.push(
        new Paragraph({
          text: 'Opinion',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `We have audited the accompanying standalone financial statements of ${reportData.entityName} (the "Company"), which comprise the Balance Sheet as at March 31, 2025, the Statement of Profit and Loss (including Other Comprehensive Income), the Statement of Changes in Equity and the Statement of Cash Flows for the year ended on that date and notes to the financial statements, including a summary of material accounting policies and other explanatory information (hereinafter referred to as the "Standalone Financial Statements").`
            ),
          ],
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `In our opinion and to the best of our information and according to the explanations given to us, the aforesaid Standalone Financial Statements give the information required by the Companies Act, 2013 (the "Act") in the manner so required and give a true and fair view in conformity with the Indian Accounting Standards prescribed under section 133 of the Act, ("Ind AS") and other accounting principles generally accepted in India, of the state of affairs of the Company as at March 31, 2025 and its profit, total comprehensive income, changes in equity and its cash flows for the year ended on that date.`
            ),
          ],
          spacing: { after: 200 },
        })
      );

      // Basis for Opinion
      children.push(
        new Paragraph({
          text: 'Basis for Opinion',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `We conducted our audit of the Standalone Financial Statements in accordance with the Standards on Auditing ("SAs") specified under section 143(10) of the Act. Our responsibilities under those Standards are further described in the Auditor's Responsibilities for the Audit of the Standalone Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India ("ICAI") together with the ethical requirements that are relevant to our audit of the Standalone Financial Statements under the provisions of the Act and the Rules made thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the ICAI's Code of Ethics. We believe that the audit evidence obtained by us is sufficient and appropriate to provide a basis for our audit opinion on the Standalone Financial Statements.`
            ),
          ],
          spacing: { after: 200 },
        })
      );

      // Key Audit Matters
      if (KAM_ENABLED && kams.length > 0) {
        children.push(
          new Paragraph({
            text: 'Key Audit Matters',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun(
                `Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the Standalone Financial Statements of the current period. These matters were addressed in the context of our audit of the Standalone Financial Statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.`
              ),
            ],
            spacing: { after: 200 },
          })
        );

        kams.forEach((kam, index) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${index + 1}. ${kam.title}`, bold: true })],
              spacing: { before: 200, after: 100 },
            })
          );
          children.push(
            new Paragraph({
              children: [new TextRun(kam.description)],
              spacing: { after: 100 },
            })
          );
          children.push(
            new Paragraph({
              children: [new TextRun({ text: 'How our audit addressed the matter:', bold: true })],
              spacing: { after: 50 },
            })
          );
          children.push(
            new Paragraph({
              children: [new TextRun(kam.audit_response)],
              spacing: { after: 200 },
            })
          );
        });
      }

      // Signature block
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `For ${reportData.auditorFirmName}`, bold: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Chartered Accountants')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: reportData.auditorName, bold: true })],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Partner')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Membership No. ${reportData.auditorMembershipNo})`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`UDIN: ${reportData.auditorUDIN}`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Place: ${reportData.auditorCity}`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Date: ${reportData.reportDate}`)],
          alignment: AlignmentType.RIGHT,
        })
      );

      // Page break before Annexure A
      children.push(new Paragraph({ children: [new PageBreak()] }));

      // Annexure A - IFCFR
      children.push(
        new Paragraph({
          text: "ANNEXURE 'A' TO THE INDEPENDENT AUDITOR'S REPORT",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `Report on the Internal Financial Controls with reference to Standalone Financial Statements under Clause (i) of sub-section 3 of Section 143 of the Companies Act, 2013 (the "Act")`
            ),
          ],
          spacing: { after: 300 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `We have audited the internal financial controls with reference to Standalone Financial Statements of ${reportData.entityName} (the "Company") as of March 31, 2025 in conjunction with our audit of the Standalone Financial Statements of the Company for the year ended on that date.`
            ),
          ],
          spacing: { after: 200 },
        })
      );

      // IFCFR signature
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `For ${reportData.auditorFirmName}`, bold: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Chartered Accountants')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: reportData.auditorName, bold: true })],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Partner')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Membership No. ${reportData.auditorMembershipNo})`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`UDIN: ${reportData.auditorUDIN}`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Place: ${reportData.auditorCity}`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Date: ${reportData.reportDate}`)],
          alignment: AlignmentType.RIGHT,
        })
      );

      // Page break before Annexure B (CARO)
      children.push(new Paragraph({ children: [new PageBreak()] }));

      // Annexure B - CARO
      children.push(
        new Paragraph({
          text: "ANNEXURE 'B' TO THE INDEPENDENT AUDITOR'S REPORT",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `(Referred to in paragraph 2 under 'Report on Other Legal and Regulatory Requirements' section of our report to the Members of ${reportData.entityName} of even date)`
            ),
          ],
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `To the best of our information and according to the explanations provided to us by the Company and the books of account and records examined by us in the normal course of audit, we state that:`
            ),
          ],
          spacing: { after: 300 },
        })
      );

      // CARO clauses - Group by parent clause prefix
      const getParentClauseId = (clauseId: string): string => {
        const match = clauseId.match(/^3\(([ivx]+)\)/i);
        return match ? `3(${match[1]})` : clauseId;
      };

      const parentClauseIds = [
        '3(i)', '3(ii)', '3(iii)', '3(iv)', '3(v)', '3(vi)', '3(vii)', '3(viii)',
        '3(ix)', '3(x)', '3(xi)', '3(xii)', '3(xiii)', '3(xiv)', '3(xv)', '3(xvi)',
        '3(xvii)', '3(xviii)', '3(xix)', '3(xx)', '3(xxi)',
      ];

      const romanNumerals = [
        'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
        'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi',
      ];

      parentClauseIds.forEach((parentClauseId, index) => {
        const romanNumeral = romanNumerals[index] || `${index + 1}`;
        
        // Find all sub-clauses that belong to this parent
        const subClauses = clauses.filter(c => 
          c.clause_id.startsWith(parentClauseId) && c.clause_id.length > parentClauseId.length
        );
        
        // Find the parent clause for title, or use first sub-clause
        const parentClause = clauses.find(c => c.clause_id === parentClauseId);
        const firstSubClause = subClauses[0];
        const clauseTitle = parentClause?.clause_title || 
          firstSubClause?.clause_title?.split(' - ')[0] || 
          `Clause ${parentClauseId}`;

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${romanNumeral}. ${clauseTitle}`,
                bold: true,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        // Collect all responses for sub-clauses
        const subClauseResponses = subClauses
          .map(sc => {
            const response = responses.find(r => r.clause_id === sc.clause_id);
            return { clause: sc, response };
          })
          .filter(item => item.response);

        // Also check for direct parent clause response
        const directResponse = responses.find(r => r.clause_id === parentClauseId);

        if (directResponse) {
          // Direct response for parent clause
          let responseText = 'Response pending.';
          if (!directResponse.is_applicable && directResponse.na_reason) {
            responseText = directResponse.na_reason;
          } else if (directResponse.conclusion_text) {
            responseText = directResponse.conclusion_text;
          }
          children.push(
            new Paragraph({
              children: [new TextRun(responseText)],
              spacing: { after: 150 },
            })
          );
        } else if (subClauseResponses.length > 0) {
          // Combine sub-clause responses
          subClauseResponses.forEach(({ clause, response }) => {
            if (!response) return;
            
            // Extract sub-clause suffix (e.g., "(a)(A)" from "3(i)(a)(A)")
            const suffix = clause.clause_id.replace(parentClauseId, '');
            
            let responseText = 'Response pending.';
            if (!response.is_applicable && response.na_reason) {
              responseText = response.na_reason;
            } else if (response.conclusion_text) {
              responseText = response.conclusion_text;
            }
            
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${suffix} `, bold: true }),
                  new TextRun(responseText),
                ],
                spacing: { after: 100 },
              })
            );
          });
        } else {
          // No responses at all
          children.push(
            new Paragraph({
              children: [new TextRun('Response not completed.')],
              spacing: { after: 150 },
            })
          );
        }
      });

      // CARO Signature
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `For ${reportData.auditorFirmName}`, bold: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Chartered Accountants')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: reportData.auditorName, bold: true })],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun('Partner')],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`(Membership No. ${reportData.auditorMembershipNo})`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`UDIN: ${reportData.auditorUDIN}`)],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Place: ${reportData.auditorCity}`)],
          alignment: AlignmentType.RIGHT,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(`Date: ${reportData.reportDate}`)],
          alignment: AlignmentType.RIGHT,
        })
      );

      const doc = new Document({
        sections: [
          {
            headers: { default: header },
            footers: { default: footer },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Audit_Report_${reportData.entityName.replace(/\s+/g, '_')}_FY${reportData.financialYear}.docx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Full Audit Report (Word) generated successfully!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setGenerating(false);
    }
  };

  const generateMainReportPDF = async () => {
    setGenerating(true);

    try {
      if (!hasProfitOrLoss) {
        toast.error('Select Profit or Loss before exporting.');
        return;
      }
      const html = resolvedMainPreviewHtml;
      if (!html.trim()) {
        toast.error('Main report preview is empty.');
        return;
      }
      await renderHtmlToPdf(
        html,
        `Main_Report_${reportData.entityName.replace(/\s+/g, '_')}_FY${reportData.financialYear}.pdf`
      );
      toast.success('Main report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const generateFullAuditReportWord = async () => {
    setGenerating(true);

    try {
      if (!hasProfitOrLoss) {
        toast.error('Select Profit or Loss before exporting.');
        return;
      }
      const sections = buildFullReportSections();
      if (!sections.length || !resolvedMainPreviewHtml.trim()) {
        toast.error('Main report preview is empty.');
        return;
      }
      const logoResponse = await fetch(caIndiaLogo);
      const logoBuffer = await logoResponse.arrayBuffer();

      const firmName = firmSettings?.firm_name || 'Firm Name';
      const firmAddress = firmSettings?.address || '';

      const header = new Header({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: 132, height: 132 },
                type: 'jpg',
                floating: {
                  horizontalPosition: {
                    offset: 0,
                    relative: HorizontalPositionRelativeFrom.MARGIN,
                  },
                  verticalPosition: {
                    offset: 0,
                    relative: VerticalPositionRelativeFrom.PARAGRAPH,
                  },
                  wrap: {
                    type: TextWrappingType.NONE,
                  },
                  behindDocument: false,
                },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: firmName, bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Chartered Accountants', italics: true, size: 22 })],
          }),
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
            spacing: { after: 200 },
          }),
        ],
      });

      const footer = new Footer({
        children: [
          new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
            spacing: { before: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: firmAddress, size: 18 })],
          }),
        ],
      });

      const children = buildDocxChildren(sections);

      const doc = new Document({
        sections: [
          {
            properties: {},
            headers: { default: header },
            footers: { default: footer },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Audit_Report_${reportData.entityName.replace(/\s+/g, '_')}_FY${reportData.financialYear}.docx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Full Audit Report (Word) generated successfully!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Report Completion Status
          </CardTitle>
          <CardDescription>
            Review the completion status before generating the final report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{completionPercentage}%</p>
              <p className="text-sm text-muted-foreground">CARO Completion</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{completedResponses.length}</p>
              <p className="text-sm text-muted-foreground">Clauses Completed</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{applicableClauses.length - completedResponses.length}</p>
              <p className="text-sm text-muted-foreground">Clauses Pending</p>
            </div>
          </div>

          {completionPercentage < 100 && setup.caro_applicable_status !== 'not_applicable' && (
            <Alert className="border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Some CARO clauses are not yet completed. You can still generate a draft report.
              </AlertDescription>
            </Alert>
          )}

          {!hasProfitOrLoss && (
            <Alert className="border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Select Profit or Loss in the Main Report configuration before exporting.
              </AlertDescription>
            </Alert>
          )}

          {!isReportDetailsComplete && (
            <Alert className="border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Report signing details are incomplete. Please go to Setup tab and fill in the Signing Partner, Report Date, Place, and UDIN before generating the final report.
              </AlertDescription>
            </Alert>
          )}

          {canExport && isReportDetailsComplete && (
            <Alert className="border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                You can now generate the audit report. Use "Generate Full Report Pack" for a complete report.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report Pack
          </CardTitle>
          <CardDescription>
            Generate and download the complete audit report package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <PdfIcon className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">Full Report Pack (PDF)</h3>
                    <p className="text-sm text-muted-foreground">Main + IFC + CARO (as applicable)</p>
                  </div>
                </div>
                <Button 
                  className="w-full gap-2" 
                  onClick={generateFullAuditReportPDF}
                  disabled={generating}
                >
                  <Download className="h-4 w-4" />
                  {generating ? 'Generating...' : 'Download PDF'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Standard PDF format
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <WordIcon className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">Full Report Pack (Word)</h3>
                    <p className="text-sm text-muted-foreground">Main + IFC + CARO with Letterhead</p>
                  </div>
                </div>
                <Button 
                  className="w-full gap-2" 
                  onClick={generateFullAuditReportWord}
                  disabled={generating}
                >
                  <Download className="h-4 w-4" />
                  {generating ? 'Generating...' : 'Download Word'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Editable with Firm Letterhead
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <PdfIcon className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold">CARO Only (PDF)</h3>
                    <p className="text-sm text-muted-foreground">Annexure B - CARO Report</p>
                  </div>
                </div>
                <Button 
                  className="w-full gap-2" 
                  variant="outline"
                  onClick={generateCAROPDF}
                  disabled={generating || !includeCaro}
                >
                  <Download className="h-4 w-4" />
                  {generating ? 'Generating...' : 'Download CARO PDF'}
                </Button>
                {!includeCaro && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Not applicable for this engagement.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">Main Report Only</h3>
                    <p className="text-sm text-muted-foreground">Independent Auditor's Report</p>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={generateMainReportPDF}
                  disabled={generating}
                >
                  <Download className="h-4 w-4" />
                  {generating ? 'Generating...' : 'Download Main Report PDF'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Report Status</h4>
              <p className="text-sm text-muted-foreground">
                {setup.locked ? 'Report is locked and finalized' : 'Report is in draft mode'}
              </p>
            </div>
            {setup.locked ? (
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Unlock className="h-3 w-3" />
                Draft
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

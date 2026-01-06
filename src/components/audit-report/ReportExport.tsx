import { useState } from 'react';
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
  CheckCircle2,
  FileType
} from 'lucide-react';
import { AuditReportSetup } from '@/hooks/useAuditReportSetup';
import { useCAROClauseResponses } from '@/hooks/useCAROClauseResponses';
import { useCAROClauseLibrary } from '@/hooks/useCAROClauseLibrary';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { usePartners } from '@/hooks/usePartners';
import { useKeyAuditMatters } from '@/hooks/useKeyAuditMatters';
import { useEngagement } from '@/contexts/EngagementContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
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

interface ReportExportProps {
  engagementId: string;
  setup: AuditReportSetup;
}

export function ReportExport({ engagementId, setup }: ReportExportProps) {
  const { responses } = useCAROClauseResponses(engagementId);
  const { clauses } = useCAROClauseLibrary();
  const { firmSettings } = useFirmSettings();
  const { partners, getPartnerById } = usePartners();
  const { kams } = useKeyAuditMatters(engagementId);
  const { currentEngagement } = useEngagement();
  const [generating, setGenerating] = useState(false);

  // Get signing partner details
  const signingPartner = (setup as any).signing_partner_id 
    ? getPartnerById((setup as any).signing_partner_id) 
    : null;

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

  const completedResponses = responses.filter(r => r.status === 'final' || r.status === 'ready_for_review' || r.status === 'in_progress');
  const completionPercentage = applicableClauses.length > 0 
    ? Math.round((completedResponses.length / applicableClauses.length) * 100)
    : 0;

  const canExport = completedResponses.length > 0 || setup.caro_applicable_status === 'not_applicable';

  // Check if report details are complete
  const isReportDetailsComplete = signingPartner && (setup as any).report_date && (setup as any).report_city;


  const generateFullAuditReportPDF = async () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let y = 25;

      const checkPageBreak = (neededSpace: number = 20) => {
        if (y > pageHeight - neededSpace - 20) {
          doc.addPage();
          y = 25;
        }
      };

      const addTitle = (text: string, fontSize: number = 14) => {
        checkPageBreak(15);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(text, pageWidth / 2, y, { align: 'center' });
        y += fontSize * 0.6;
      };

      const addHeading = (text: string, fontSize: number = 11) => {
        checkPageBreak(12);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(text, margin, y);
        y += fontSize * 0.5 + 2;
      };

      const addParagraph = (text: string, fontSize: number = 10, indent: number = 0) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(text, maxWidth - indent);
        
        lines.forEach((line: string) => {
          checkPageBreak(fontSize * 0.5 + 2);
          doc.text(line, margin + indent, y);
          y += fontSize * 0.45;
        });
        y += 3;
      };

      // ===== MAIN REPORT =====
      addTitle('INDEPENDENT AUDITOR\'S REPORT');
      y += 3;
      addParagraph(`TO THE MEMBERS OF ${reportData.entityName}`, 11);
      y += 5;

      addHeading('Report on the Audit of the Standalone Financial Statements');
      y += 3;

      addHeading('Opinion');
      addParagraph(`We have audited the accompanying standalone financial statements of ${reportData.entityName} (the "Company"), which comprise the Balance Sheet as at March 31, 2025, the Statement of Profit and Loss (including Other Comprehensive Income), the Statement of Changes in Equity and the Statement of Cash Flows for the year ended on that date and notes to the financial statements, including a summary of material accounting policies and other explanatory information (hereinafter referred to as the "Standalone Financial Statements").`);
      
      addParagraph(`In our opinion and to the best of our information and according to the explanations given to us, the aforesaid Standalone Financial Statements give the information required by the Companies Act, 2013 (the "Act") in the manner so required and give a true and fair view in conformity with the Indian Accounting Standards prescribed under section 133 of the Act, ("Ind AS") and other accounting principles generally accepted in India, of the state of affairs of the Company as at March 31, 2025 and its profit, total comprehensive income, changes in equity and its cash flows for the year ended on that date.`);

      y += 3;
      addHeading('Basis for Opinion');
      addParagraph(`We conducted our audit of the Standalone Financial Statements in accordance with the Standards on Auditing ("SAs") specified under section 143(10) of the Act. Our responsibilities under those Standards are further described in the Auditor's Responsibilities for the Audit of the Standalone Financial Statements section of our report. We are independent of the Company in accordance with the Code of Ethics issued by the Institute of Chartered Accountants of India ("ICAI") together with the ethical requirements that are relevant to our audit of the Standalone Financial Statements under the provisions of the Act and the Rules made thereunder, and we have fulfilled our other ethical responsibilities in accordance with these requirements and the ICAI's Code of Ethics. We believe that the audit evidence obtained by us is sufficient and appropriate to provide a basis for our audit opinion on the Standalone Financial Statements.`);

      // Key Audit Matters from database
      if (kams.length > 0) {
        y += 3;
        addHeading('Key Audit Matters');
        addParagraph(`Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the Standalone Financial Statements of the current period. These matters were addressed in the context of our audit of the Standalone Financial Statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.`);

        kams.forEach((kam, index) => {
          checkPageBreak(30);
          addHeading(`${index + 1}. ${kam.title}`, 10);
          addParagraph(kam.description, 9);
          
          checkPageBreak(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('How our audit addressed the matter:', margin, y);
          y += 5;
          addParagraph(kam.audit_response, 9);
          y += 3;
        });
      }

      // Other standard sections
      y += 3;
      addHeading('Information Other than the Financial Statements and Auditor\'s Report Thereon');
      addParagraph(`The Company's Management and Board of Directors are responsible for the other information. The other information comprises the information included in the Company's Annual Report but does not include the Standalone Financial Statements and our auditor's report thereon.`);
      addParagraph(`Our opinion on the Standalone Financial Statements does not cover the other information and we do not express any form of assurance conclusion thereon.`);

      y += 3;
      addHeading('Management\'s and Board of Directors\' Responsibilities for the Standalone Financial Statements');
      addParagraph(`The Company's Management and Board of Directors are responsible for the matters stated in section 134(5) of the Act with respect to the preparation of these Standalone Financial Statements that give a true and fair view of the state of affairs, profit/loss and other comprehensive income, changes in equity and cash flows of the Company in accordance with the accounting principles generally accepted in India, including the Indian Accounting Standards (Ind AS) specified under section 133 of the Act.`);

      y += 3;
      addHeading('Auditor\'s Responsibilities for the Audit of the Standalone Financial Statements');
      addParagraph(`Our objectives are to obtain reasonable assurance about whether the Standalone Financial Statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that an audit conducted in accordance with SAs will always detect a material misstatement when it exists.`);

      // Report on Other Legal and Regulatory Requirements
      doc.addPage();
      y = 25;
      addHeading('Report on Other Legal and Regulatory Requirements');
      addParagraph(`1. As required by Section 143(3) of the Act, based on our audit, we report, to the extent applicable that:`);
      addParagraph(`(a) We have sought and obtained all the information and explanations which to the best of our knowledge and belief were necessary for the purposes of our audit.`, 10, 10);
      addParagraph(`(b) In our opinion, proper books of account as required by law have been kept by the Company so far as it appears from our examination of those books.`, 10, 10);
      addParagraph(`(c) The Balance Sheet, the Statement of Profit and Loss including Other Comprehensive Income, the Statement of Changes in Equity and the Statement of Cash Flows dealt with by this Report are in agreement with the books of account.`, 10, 10);
      addParagraph(`(d) In our opinion, the aforesaid Standalone Financial Statements comply with the Ind AS specified under Section 133 of the Act.`, 10, 10);
      addParagraph(`(e) On the basis of the written representations received from the directors as on March 31, 2025 taken on record by the Board of Directors, none of the directors is disqualified as on March 31, 2025 from being appointed as a director in terms of Section 164(2) of the Act.`, 10, 10);
      addParagraph(`(f) With respect to the adequacy of the internal financial controls with reference to financial statements of the Company and the operating effectiveness of such controls, refer to our separate Report in "Annexure A".`, 10, 10);

      addParagraph(`2. With respect to the other matters to be included in the Auditor's Report in accordance with Rule 11 of the Companies (Audit and Auditors) Rules, 2014, as amended, in our opinion and to the best of our information and according to the explanations given to us:`);
      addParagraph(`(a) The Company has disclosed the impact of pending litigations as at March 31, 2025 on its financial position in its Standalone Financial Statements.`, 10, 10);
      addParagraph(`(b) The Company has made provision, as required under the applicable law or accounting standards, for material foreseeable losses, if any, on long-term contracts including derivative contracts.`, 10, 10);
      addParagraph(`(c) There has been no delay in transferring amounts, required to be transferred, to the Investor Education and Protection Fund by the Company.`, 10, 10);

      addParagraph(`3. With respect to the matter to be included in the Auditor's Report under Section 197(16), as amended: In our opinion and according to the information and explanations given to us, the remuneration paid by the Company to its directors during the current year is in accordance with the provisions of Section 197 of the Act.`);

      // Signature block
      y += 10;
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const signX = pageWidth - margin - 60;
      doc.text(`For ${reportData.auditorFirmName}`, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Chartered Accountants', signX, y);
      y += 5;
      doc.text(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`, signX, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.auditorName, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Partner', signX, y);
      y += 5;
      doc.text(`(Membership No. ${reportData.auditorMembershipNo})`, signX, y);
      y += 5;
      doc.text(`UDIN: ${reportData.auditorUDIN}`, signX, y);
      y += 10;
      doc.text(`Place: ${reportData.auditorCity}`, signX, y);
      y += 5;
      doc.text(`Date: ${reportData.reportDate}`, signX, y);

      // ===== ANNEXURE A - IFCFR =====
      doc.addPage();
      y = 25;
      addTitle('ANNEXURE "A" TO THE INDEPENDENT AUDITOR\'S REPORT');
      y += 3;
      addParagraph('Report on the Internal Financial Controls with reference to Standalone Financial Statements under Clause (i) of sub-section 3 of Section 143 of the Companies Act, 2013 (the "Act")', 10);
      y += 5;

      addParagraph(`We have audited the internal financial controls with reference to Standalone Financial Statements of ${reportData.entityName} (the "Company") as of March 31, 2025 in conjunction with our audit of the Standalone Financial Statements of the Company for the year ended on that date.`);

      y += 3;
      addHeading('Management\'s and Board of Directors\' Responsibilities for Internal Financial Controls');
      addParagraph(`The Company's Management and Board of Directors are responsible for establishing and maintaining internal financial controls with reference to Standalone Financial Statements based on the internal control over financial reporting criteria established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the Institute of Chartered Accountants of India (the "ICAI").`);

      y += 3;
      addHeading('Auditor\'s Responsibility');
      addParagraph(`Our responsibility is to express an opinion on the Company's internal financial controls with reference to Standalone Financial Statements based on our audit. We conducted our audit in accordance with the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting (the "Guidance Note") issued by the ICAI and the Standards on Auditing prescribed under Section 143(10) of the Act, to the extent applicable to an audit of internal financial controls with reference to Standalone Financial Statements.`);

      y += 3;
      addHeading('Opinion');
      addParagraph(`In our opinion, to the best of our information and according to the explanations given to us, the Company has, in all material respects, an adequate internal financial controls with reference to Standalone Financial Statements and such internal financial controls with reference to Standalone Financial Statements were operating effectively as at March 31, 2025, based on the criteria for internal financial control with reference to Standalone Financial Statements established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the ICAI.`);

      // IFCFR Signature
      y += 10;
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`For ${reportData.auditorFirmName}`, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Chartered Accountants', signX, y);
      y += 5;
      doc.text(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`, signX, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.auditorName, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Partner', signX, y);
      y += 5;
      doc.text(`(Membership No. ${reportData.auditorMembershipNo})`, signX, y);
      y += 5;
      doc.text(`UDIN: ${reportData.auditorUDIN}`, signX, y);
      y += 10;
      doc.text(`Place: ${reportData.auditorCity}`, signX, y);
      y += 5;
      doc.text(`Date: ${reportData.reportDate}`, signX, y);

      // ===== ANNEXURE B - CARO =====
      doc.addPage();
      y = 25;
      addTitle('ANNEXURE \'B\' TO THE INDEPENDENT AUDITOR\'S REPORT');
      y += 3;
      addParagraph(`(Referred to in paragraph 2 under 'Report on Other Legal and Regulatory Requirements' section of our report to the Members of ${reportData.entityName} of even date)`, 9);
      y += 3;
      addParagraph('To the best of our information and according to the explanations provided to us by the Company and the books of account and records examined by us in the normal course of audit, we state that:', 10);
      y += 5;

      // CARO Clauses
      const orderedClauseIds = [
        '3(i)', '3(ii)', '3(iii)', '3(iv)', '3(v)', '3(vi)', '3(vii)', '3(viii)',
        '3(ix)', '3(x)', '3(xi)', '3(xii)', '3(xiii)', '3(xiv)', '3(xv)', '3(xvi)',
        '3(xvii)', '3(xviii)', '3(xix)', '3(xx)', '3(xxi)'
      ];

      orderedClauseIds.forEach((clauseId, index) => {
        const response = responses.find(r => r.clause_id === clauseId);
        const clause = clauses.find(c => c.clause_id === clauseId);
        
        checkPageBreak(20);
        
        // Roman numeral for main clause
        const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 
                                'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'];
        const romanNumeral = romanNumerals[index] || `${index + 1}`;
        
        if (clause) {
          addHeading(`${romanNumeral}. ${clause.clause_title}`, 10);
        } else {
          addHeading(`${romanNumeral}. Clause ${clauseId}`, 10);
        }
        
        if (response) {
          if (!response.is_applicable && response.na_reason) {
            addParagraph(response.na_reason, 9);
          } else if (response.conclusion_text) {
            addParagraph(response.conclusion_text, 9);
          } else {
            addParagraph('Response pending.', 9);
          }
        } else {
          addParagraph('Response not completed.', 9);
        }
        y += 3;
      });

      // CARO Signature
      checkPageBreak(50);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`For ${reportData.auditorFirmName}`, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Chartered Accountants', signX, y);
      y += 5;
      doc.text(`(Firm's Registration No. ${reportData.auditorFirmRegNo})`, signX, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.auditorName, signX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Partner', signX, y);
      y += 5;
      doc.text(`(Membership No. ${reportData.auditorMembershipNo})`, signX, y);
      y += 5;
      doc.text(`UDIN: ${reportData.auditorUDIN}`, signX, y);
      y += 10;
      doc.text(`Place: ${reportData.auditorCity}`, signX, y);
      y += 5;
      doc.text(`Date: ${reportData.reportDate}`, signX, y);

      // Save
      doc.save(`Audit_Report_${reportData.entityName.replace(/\s+/g, '_')}_FY${reportData.financialYear}.pdf`);
      toast.success('Full Audit Report Package generated successfully!');
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

      // Header
      addText('ANNEXURE B TO THE INDEPENDENT AUDITOR\'S REPORT', 14, true, 'center');
      y += 5;
      addText('(Referred to in paragraph 2 under \'Report on Other Legal and Regulatory Requirements\' section of our report of even date)', 10, false, 'center');
      y += 10;

      // CARO Clauses
      applicableClauses.forEach((clause) => {
        const response = responses.find(r => r.clause_id === clause.clause_id);
        
        addText(`Clause ${clause.clause_id}: ${clause.clause_title}`, 11, true);
        
        if (response) {
          if (!response.is_applicable) {
            addText(response.na_reason || `This clause is not applicable to the company.`);
          } else {
            addText(response.conclusion_text || 'Response pending.');
          }
        } else {
          addText('Response not completed.');
        }
        
        y += 5;
      });

      // Save
      doc.save(`CARO_2020_Annexure_${engagementId.slice(0, 8)}.pdf`);
      toast.success('CARO Annexure generated successfully');
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
      if (kams.length > 0) {
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
                    <p className="text-sm text-muted-foreground">Main + IFCFR + CARO</p>
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
                    <p className="text-sm text-muted-foreground">Main + IFCFR + CARO with Letterhead</p>
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
                  disabled={generating}
                >
                  <Download className="h-4 w-4" />
                  {generating ? 'Generating...' : 'Download CARO PDF'}
                </Button>
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
                <Button className="w-full gap-2" variant="outline" disabled>
                  <Download className="h-4 w-4" />
                  Coming Soon
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

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

interface Engagement {
  id: string;
  client_name: string;
  name: string;
  engagement_type: string;
  financial_year: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  materiality_amount: number | null;
  performance_materiality: number | null;
  trivial_threshold: number | null;
  notes: string | null;
}

export async function generateEngagementReport(engagement: Engagement): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Fetch related data
  const [risksRes, reviewNotesRes] = await Promise.all([
    db
      .from('risks')
      .select('*')
      .eq('engagement_id', engagement.id)
      .order('risk_area', { ascending: true })
      .execute(),
    db
      .from('review_notes')
      .select('*')
      .eq('engagement_id', engagement.id)
      .order('created_at', { ascending: false })
      .execute(),
  ]);

  const risks = risksRes.data || [];
  const reviewNotes = reviewNotesRes.data || [];

  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Engagement Report', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(14);
  doc.text(engagement.client_name, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(engagement.name, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, pageWidth / 2, yPos, { align: 'center' });

  // Engagement Details Section
  yPos += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Engagement Details', 14, yPos);
  
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Client Name', engagement.client_name],
      ['Engagement Name', engagement.name],
      ['Type', engagement.engagement_type.charAt(0).toUpperCase() + engagement.engagement_type.slice(1)],
      ['Financial Year', engagement.financial_year],
      ['Status', engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1)],
      ['Start Date', engagement.start_date ? format(new Date(engagement.start_date), 'dd MMM yyyy') : 'Not set'],
      ['End Date', engagement.end_date ? format(new Date(engagement.end_date), 'dd MMM yyyy') : 'Not set'],
      ['Materiality', engagement.materiality_amount ? `₹${engagement.materiality_amount.toLocaleString()}` : 'Not set'],
      ['Performance Materiality', engagement.performance_materiality ? `₹${engagement.performance_materiality.toLocaleString()}` : 'Not set'],
      ['Trivial Threshold', engagement.trivial_threshold ? `₹${engagement.trivial_threshold.toLocaleString()}` : 'Not set'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
  });

  // Risks Section
  yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Risk Assessment (${risks.length})`, 14, yPos);
  
  if (risks.length > 0) {
    yPos += 5;
    autoTable(doc, {
      startY: yPos,
      head: [['Risk Area', 'Description', 'Inherent', 'Control', 'Combined', 'Status']],
      body: risks.map(r => [
        r.risk_area,
        r.description.substring(0, 50) + (r.description.length > 50 ? '...' : ''),
        r.inherent_risk,
        r.control_risk,
        r.combined_risk,
        r.status,
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      },
    });
  } else {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No risks identified', 14, yPos);
  }

  // Review Notes Section
  yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Review Notes (${reviewNotes.length})`, 14, yPos);
  
  if (reviewNotes.length > 0) {
    yPos += 5;
    autoTable(doc, {
      startY: yPos,
      head: [['Title', 'Priority', 'Status', 'Created', 'Response']],
      body: reviewNotes.map(n => [
        n.title,
        n.priority,
        n.status,
        format(new Date(n.created_at), 'dd MMM yyyy'),
        n.response ? n.response.substring(0, 40) + '...' : '-',
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94] },
    });
  } else {
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No review notes', 14, yPos);
  }

  // Summary Statistics
  yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Statistics', 14, yPos);
  
  const riskStats = {
    total: risks.length,
    high: risks.filter(r => r.combined_risk === 'high').length,
    medium: risks.filter(r => r.combined_risk === 'medium').length,
    low: risks.filter(r => r.combined_risk === 'low').length,
  };
  
  const noteStats = {
    total: reviewNotes.length,
    open: reviewNotes.filter(n => n.status === 'open').length,
    responded: reviewNotes.filter(n => n.status === 'responded').length,
    cleared: reviewNotes.filter(n => n.status === 'cleared').length,
  };

  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Total', 'Completed/Cleared', 'In Progress/Open', 'Other']],
    body: [
      ['Risks', riskStats.total, '-', '-', `High: ${riskStats.high}, Med: ${riskStats.medium}, Low: ${riskStats.low}`],
      ['Review Notes', noteStats.total, noteStats.cleared, noteStats.open, noteStats.responded],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [107, 114, 128] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `${engagement.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${engagement.financial_year}_Report.pdf`;
  doc.save(fileName);
}

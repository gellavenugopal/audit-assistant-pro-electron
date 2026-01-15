import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useEngagement } from '@/contexts/EngagementContext';
import { useEvidenceFiles, EvidenceFile } from '@/hooks/useEvidenceFiles';
import { Check, ClipboardCheck, Eye, FileDown, Pencil, Trash2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

const CHECKLIST_CRITERIA = [
  'The reputation of the company and its management',
  'The effectiveness of its Board (Capabilities and track record of management)',
  "The background and experience of the client's financial reporting personnel",
  'Any incentives or inclinations for management to manipulate reported results',
  'Any significant transactions structured to achieve revenue recognition',
  'Any unusually aggressive or creative accounting (Any evidence of lack of integrity/ethics, poor control environment)',
  'Any transactions that are complex, unusual, or difficult to evaluate',
  'Any estimates that involve uncertainty or subjective judgments which cannot be addressed',
  'Any transactions with related parties that are not part of the consolidated group',
  'Any indications that the company might be in financial difficulty (Review financial condition, consider inherent risks for client and its industry)',
  'A lack of required expertise for the engagement team',
  'Are we independent and can we conduct the audit in accordance with ethical requirements',
  'Does our Firm/Engagement Team has the necessary expertise and capability to execute the said engagement and that too within stipulated time period',
];

const RESPONSE_OPTIONS = ['Yes', 'No', 'NA'];
const CHECKLIST_VERSION = 2;

type ChecklistItem = {
  id: string;
  criteria: string;
  response: string;
  remarks: string;
  isCustom: boolean;
};

type ChecklistFormState = {
  clientName: string;
  engagementType: string;
  engagementPeriod: string;
  items: ChecklistItem[];
  decision: string;
  remarks: string;
};

const getEngagementTypeLabel = (type?: string) => {
  switch (type) {
    case 'statutory':
      return 'Statutory Audit';
    case 'internal':
      return 'Internal Audit';
    case 'tax':
      return 'Tax Audit';
    case 'limited_review':
      return 'Limited Review';
    default:
      return type || 'Statutory Audit';
  }
};

const buildEngagementPeriod = (financialYear?: string) => {
  if (!financialYear) return 'for the year ended March 31, XXXX';
  const match = financialYear.match(/(\\d{4})\\D+(\\d{2,4})/);
  if (!match) return `for the year ended March 31, ${financialYear}`;
  const startYear = Number(match[1]);
  const endPart = match[2];
  let endYear = Number(endPart);
  if (endPart.length === 2) {
    endYear = Math.floor(startYear / 100) * 100 + endYear;
  }
  if (!Number.isFinite(endYear) || endYear < 1900) {
    return `for the year ended March 31, ${financialYear}`;
  }
  return `for the year ended March 31, ${endYear}`;
};

const buildDefaultItems = () =>
  CHECKLIST_CRITERIA.map((criteria, index) => ({
    id: `base-${index + 1}`,
    criteria,
    response: '',
    remarks: '',
    isCustom: false,
  }));

export function EngagementAcceptanceChecklist() {
  const { currentEngagement } = useEngagement();
  const { files, uploadFile, downloadFile, getFileUrl } = useEvidenceFiles(currentEngagement?.id);
  const signedChecklistInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newCriteria, setNewCriteria] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const defaultState = useMemo<ChecklistFormState>(() => ({
    clientName: currentEngagement?.client_name || '',
    engagementType: getEngagementTypeLabel(currentEngagement?.engagement_type),
    engagementPeriod: buildEngagementPeriod(currentEngagement?.financial_year),
    items: buildDefaultItems(),
    decision: '',
    remarks: '',
  }), [currentEngagement?.client_name, currentEngagement?.engagement_type, currentEngagement?.financial_year]);

  const [formState, setFormState] = useState<ChecklistFormState>(defaultState);

  const storageKey = currentEngagement?.id
    ? `engagement_acceptance_checklist_${currentEngagement.id}`
    : null;

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChecklistFormState & { version?: number };
        const parsedVersion = typeof parsed.version === 'number' ? parsed.version : 1;
        let items = Array.isArray(parsed.items) && parsed.items.length > 0
          ? parsed.items.map((item, idx) => ({
              id: item.id || `custom-${idx + 1}`,
              criteria: item.criteria || '',
              response: item.response || '',
              remarks: item.remarks || '',
              isCustom: Boolean(item.isCustom),
            }))
          : Array.isArray((parsed as any).responses)
            ? buildDefaultItems().map((item, idx) => ({
                ...item,
                response: (parsed as any).responses[idx] || '',
              }))
            : defaultState.items;

        const baseItems = buildDefaultItems();
        const baseIds = new Set(baseItems.map((item) => item.id));
        const existingBaseIds = new Set(
          items.filter((item) => baseIds.has(item.id)).map((item) => item.id)
        );
        const isMissingBase = baseItems.some((item) => !existingBaseIds.has(item.id));

        if (parsedVersion < CHECKLIST_VERSION || isMissingBase) {
          const baseItemMap = new Map(
            items
              .filter((item) => baseIds.has(item.id))
              .map((item) => [item.id, { ...item, isCustom: false }])
          );
          const customItems = items.filter((item) => !baseIds.has(item.id));
          items = [
            ...baseItems.map((item) => baseItemMap.get(item.id) ?? item),
            ...customItems,
          ];
        }

        setFormState({
          ...defaultState,
          ...parsed,
          items,
        });
        return;
      } catch (error) {
        console.warn('Unable to parse saved checklist data', error);
      }
    }
    setFormState(defaultState);
  }, [defaultState, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ version: CHECKLIST_VERSION, ...formState }));
  }, [formState, storageKey]);

  const signedChecklistFiles = files.filter(
    (file) => file.file_type === 'engagement_acceptance_checklist_signed'
  );

  const openFilePreview = async (file: EvidenceFile) => {
    const url = await getFileUrl(file);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Unable to preview this file.');
    }
  };

  const renderFileList = (items: EvidenceFile[]) => {
    if (items.length === 0) {
      return <p className="text-xs text-muted-foreground">No uploads yet.</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openFilePreview(item)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button size="sm" onClick={() => downloadFile(item)}>
                <FileDown className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const updateResponse = (index: number, value: string) => {
    setFormState((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], response: value };
      return { ...prev, items: next };
    });
  };

  const updateRemarks = (index: number, value: string) => {
    setFormState((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], remarks: value };
      return { ...prev, items: next };
    });
  };

  const handleAddCriteria = () => {
    const trimmed = newCriteria.trim();
    if (!trimmed) return;
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `custom-${Date.now()}`,
          criteria: trimmed,
          response: '',
          remarks: '',
          isCustom: true,
        },
      ],
    }));
    setNewCriteria('');
  };

  const startEditCriteria = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingValue(item.criteria);
  };

  const cancelEditCriteria = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEditCriteria = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setFormState((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], criteria: trimmed };
      return { ...prev, items: next };
    });
    cancelEditCriteria();
  };

  const deleteCriteria = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (editingId === id) {
      cancelEditCriteria();
    }
  };

  const handleSignedChecklistUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    const file = selected[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'doc', 'docx'];
    if (!extension || !validExtensions.includes(extension)) {
      toast.error('Invalid file format. Only PDF, JPEG, or DOC/DOCX files are allowed.');
      event.target.value = '';
      return;
    }

    const uploaded = await uploadFile(file, {
      name: file.name,
      file_type: 'engagement_acceptance_checklist_signed',
    });

    if (uploaded) {
      toast.success('Signed checklist uploaded successfully.');
    }

    event.target.value = '';
  };

  const handleExportWord = async () => {
    const topRows = [
      ['Topic', 'Engagement Acceptance/ Continuation Decision Checklist'],
      ['Client Name', formState.clientName],
      ['Engagement Type', formState.engagementType],
      ['Eng Period', formState.engagementPeriod],
    ];

    const makeCell = (text: string, bold = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: text || '', bold })],
          }),
        ],
      });

    const topTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: topRows.map((row, idx) =>
        new TableRow({
          children: row.map((cell, cellIdx) => makeCell(cell, idx === 0 || cellIdx === 0)),
        })
      ),
    });

    const riskTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeCell('Does the Firm/ engagement team have reasons to have concerns about', true),
            makeCell('Response', true),
            makeCell('Remarks', true),
          ],
        }),
        ...formState.items.map((item, idx) =>
          new TableRow({
            children: [
              makeCell(`${idx + 1}. ${item.criteria}`),
              makeCell(item.response || ''),
              makeCell(item.remarks || ''),
            ],
          })
        ),
      ],
    });

    const doc = new Document({
      sections: [
        {
          children: [
            topTable,
            new Paragraph(''),
            new Paragraph({
              children: [new TextRun({ text: 'Client/Engagement Acceptance Decision Checklist', bold: true })],
            }),
            new Paragraph(''),
            riskTable,
            new Paragraph(''),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    'Select Yes/No/NA as applicable and decide on the apparent prima facie risk of the engagement to decide whether to accept/continue the engagement or not.',
                  bold: true,
                }),
              ],
            }),
            new Paragraph(''),
            new Paragraph(`Decision - ${formState.decision || ''}`),
            new Paragraph(
              'You may mention here that the assignment has been accepted or rejected based on your judgement'
            ),
            new Paragraph(`(Remarks for not accepting) - ${formState.remarks || ''}`),
            new Paragraph('If not accepting, please mention a brief reason of not accepting the assignment.'),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const clientName = formState.clientName || currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    link.href = url;
    link.download = `Engagement_Acceptance_Checklist_${clientName.replace(/\\s+/g, '_')}_${financialYear}.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const writeWrappedText = (text: string, startY: number, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, startY);
      return startY + lines.length * (fontSize + 4);
    };

    const topRows = [
      ['Topic', 'Engagement Acceptance/ Continuation Decision Checklist'],
      ['Client Name', formState.clientName],
      ['Engagement Type', formState.engagementType],
      ['Eng Period', formState.engagementPeriod],
    ];

    autoTable(doc, {
      startY: 40,
      body: topRows,
      theme: 'grid',
      styles: { fontSize: 9 },
    });

    const tableEndY = (doc as any).lastAutoTable?.finalY || 40;
    doc.setFontSize(11);
    doc.text('Client/Engagement Acceptance Decision Checklist', margin, tableEndY + 24);

    autoTable(doc, {
      startY: tableEndY + 32,
      head: [['Does the Firm/ engagement team have reasons to have concerns about', 'Response', 'Remarks']],
      body: formState.items.map((item, idx) => [
        `${idx + 1}. ${item.criteria}`,
        item.response || '',
        item.remarks || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [230, 230, 230] },
    });

    let currentY = (doc as any).lastAutoTable?.finalY || tableEndY + 32;
    currentY = writeWrappedText(
      'Select Yes/No/NA as applicable and decide on the apparent prima facie risk of the engagement to decide whether to accept/continue the engagement or not.',
      currentY + 18
    );
    currentY = writeWrappedText(`Decision - ${formState.decision || ''}`, currentY);
    currentY = writeWrappedText(
      'You may mention here that the assignment has been accepted or rejected based on your judgement',
      currentY
    );
    currentY = writeWrappedText(`(Remarks for not accepting) - ${formState.remarks || ''}`, currentY);
    writeWrappedText('If not accepting, please mention a brief reason of not accepting the assignment.', currentY);

    const clientName = formState.clientName || currentEngagement?.client_name || 'Client';
    const financialYear = currentEngagement?.financial_year || 'FY';
    doc.save(`Engagement_Acceptance_Checklist_${clientName.replace(/\\s+/g, '_')}_${financialYear}.pdf`);
  };

  const PreviewTable = () => (
    <div className="space-y-4 text-sm">
      <table className="w-full border-collapse table-fixed">
        <tbody>
          <tr>
            <td className="border px-2 py-1 font-semibold">Topic</td>
            <td className="border px-2 py-1 font-semibold">
              Engagement Acceptance/ Continuation Decision Checklist
            </td>
          </tr>
          <tr>
            <td className="border px-2 py-1 font-semibold">Client Name</td>
            <td className="border px-2 py-1">{formState.clientName}</td>
          </tr>
          <tr>
            <td className="border px-2 py-1 font-semibold">Engagement Type</td>
            <td className="border px-2 py-1">{formState.engagementType}</td>
          </tr>
          <tr>
            <td className="border px-2 py-1 font-semibold">Eng Period</td>
            <td className="border px-2 py-1">{formState.engagementPeriod}</td>
          </tr>
        </tbody>
      </table>

      <p className="font-semibold">Client/Engagement Acceptance Decision Checklist</p>

      <table className="w-full border-collapse table-auto">
        <thead>
          <tr className="bg-muted/40">
            <th className="border px-2 py-1 text-left align-top whitespace-normal break-words">
              Does the Firm/ engagement team have reasons to have concerns about
            </th>
            <th className="border px-2 py-1 text-left w-24">Response</th>
            <th className="border px-2 py-1 text-left w-56">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {formState.items.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
              <td className="border px-2 py-1 align-top whitespace-normal break-words">
                {`${idx + 1}. ${item.criteria}`}
              </td>
              <td className="border px-2 py-1">{item.response}</td>
              <td className="border px-2 py-1">{item.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="font-semibold">
        Select Yes/No/NA as applicable and decide on the apparent prima facie risk of the engagement to decide whether to accept/continue the engagement or not.
      </p>
      <p>Decision - {formState.decision}</p>
      <p>You may mention here that the assignment has been accepted or rejected based on your judgement</p>
      <p>(Remarks for not accepting) - {formState.remarks}</p>
      <p>If not accepting, please mention a brief reason of not accepting the assignment.</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Engagement Acceptance Decision / Continuation Decision Checklist
            </CardTitle>
            <CardDescription>
              Capture acceptance or continuation decision checklist details.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={signedChecklistInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleSignedChecklistUpload}
              className="hidden"
            />
            <Button size="sm" onClick={() => signedChecklistInputRef.current?.click()}>
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload signed checklist
            </Button>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Checklist Preview</DialogTitle>
                </DialogHeader>
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                  <PreviewTable />
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={handleExportWord}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Word
            </Button>
            <Button size="sm" onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-semibold">Signed checklist uploads</Label>
          <div className="mt-2">
            {renderFileList(signedChecklistFiles)}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              value={formState.clientName}
              onChange={(e) => setFormState((prev) => ({ ...prev, clientName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Engagement Type</Label>
            <Input
              value={formState.engagementType}
              onChange={(e) => setFormState((prev) => ({ ...prev, engagementType: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Engagement Period</Label>
            <Input
              value={formState.engagementPeriod}
              onChange={(e) => setFormState((prev) => ({ ...prev, engagementPeriod: e.target.value }))}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm table-auto">
              <thead>
                <tr className="bg-muted/40">
                  <th className="border px-3 py-2 text-left align-top whitespace-normal break-words">
                    Does the Firm/ engagement team have reasons to have concerns about
                  </th>
                  <th className="border px-3 py-2 text-left w-28">Response</th>
                  <th className="border px-3 py-2 text-left w-64">Remarks</th>
                  <th className="border px-3 py-2 text-left w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formState.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2 align-top whitespace-normal break-words">
                      {editingId === item.id ? (
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                        />
                      ) : (
                        `${idx + 1}. ${item.criteria}`
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      <Select
                        value={item.response || ''}
                        onValueChange={(value) => updateResponse(idx, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESPONSE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border px-3 py-2">
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateRemarks(idx, e.target.value)}
                        placeholder="Remarks"
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <div className="flex items-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEditCriteria(idx)}
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditCriteria}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditCriteria(item)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteCriteria(item.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Select Yes/No/NA as applicable and decide on the apparent prima facie risk of the engagement to decide whether to accept/continue the engagement or not.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              value={newCriteria}
              onChange={(e) => setNewCriteria(e.target.value)}
              placeholder="Add new checklist item"
              className="max-w-md"
            />
            <Button size="sm" onClick={handleAddCriteria}>
              Add line item
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Textarea
              rows={3}
              value={formState.decision}
              onChange={(e) => setFormState((prev) => ({ ...prev, decision: e.target.value }))}
              placeholder="Mention whether the assignment has been accepted or rejected."
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks for not accepting</Label>
            <Textarea
              rows={3}
              value={formState.remarks}
              onChange={(e) => setFormState((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Provide brief reasons if not accepting."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

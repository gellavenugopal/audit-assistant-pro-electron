import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportResult {
  row: number;
  data: Record<string, string>;
  success: boolean;
  error?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: ImportField[];
  onImport: (data: Record<string, string>[]) => Promise<void>;
  onImportRow?: (data: Record<string, string>) => Promise<void>;
  templateData?: Record<string, string>[];
}

export function BulkImportDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onImport,
  onImportRow,
  templateData,
}: BulkImportDialogProps) {
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
          raw: false,
          defval: '' 
        });

        if (jsonData.length === 0) {
          setErrors(['The file appears to be empty']);
          setParsedData([]);
          return;
        }

        // Validate required fields
        const validationErrors: string[] = [];
        const requiredFields = fields.filter(f => f.required).map(f => f.key);
        
        jsonData.forEach((row, index) => {
          requiredFields.forEach(field => {
            const value = row[field] || row[field.toLowerCase()] || row[field.replace(/_/g, ' ')];
            if (!value || value.toString().trim() === '') {
              validationErrors.push(`Row ${index + 2}: Missing required field "${field}"`);
            }
          });
        });

        // Normalize field names (handle case insensitivity and spaces vs underscores)
        const normalizedData = jsonData.map(row => {
          const normalized: Record<string, string> = {};
          fields.forEach(field => {
            const possibleKeys = [
              field.key,
              field.key.toLowerCase(),
              field.key.replace(/_/g, ' '),
              field.key.replace(/_/g, ' ').toLowerCase(),
              field.label,
              field.label.toLowerCase(),
            ];
            
            for (const key of possibleKeys) {
              if (row[key] !== undefined) {
                normalized[field.key] = row[key].toString().trim();
                break;
              }
            }
            
            if (normalized[field.key] === undefined) {
              normalized[field.key] = '';
            }
          });
          return normalized;
        });

        setErrors(validationErrors.slice(0, 5)); // Show first 5 errors
        setParsedData(normalizedData);
      } catch (error) {
        console.error('Error parsing file:', error);
        setErrors(['Failed to parse file. Please ensure it is a valid Excel or CSV file.']);
        setParsedData([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    const results: ImportResult[] = [];

    try {
      if (onImportRow) {
        // Import row by row to track individual failures
        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          try {
            await onImportRow(row);
            results.push({ row: i + 2, data: row, success: true });
          } catch (error: any) {
            results.push({ 
              row: i + 2, 
              data: row, 
              success: false, 
              error: error.message || 'Unknown error' 
            });
          }
        }
      } else {
        // Use batch import - if it fails, all rows fail
        try {
          await onImport(parsedData);
          parsedData.forEach((row, i) => {
            results.push({ row: i + 2, data: row, success: true });
          });
        } catch (error: any) {
          parsedData.forEach((row, i) => {
            results.push({ 
              row: i + 2, 
              data: row, 
              success: false, 
              error: error.message || 'Unknown error' 
            });
          });
        }
      }

      setImportResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully imported ${successCount} records`);
      } else if (successCount === 0) {
        toast.error(`Failed to import all ${failCount} records`);
      } else {
        toast.warning(`Imported ${successCount} records, ${failCount} failed`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setErrors([]);
    setFileName(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const templateRows = templateData || [
      fields.reduce((acc, field) => {
        acc[field.key] = field.required ? `Example ${field.label}` : '';
        return acc;
      }, {} as Record<string, string>),
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_Template.xlsx`);
  };

  const downloadErrorReport = () => {
    if (!importResults) return;

    const failedRows = importResults
      .filter(r => !r.success)
      .map(r => ({
        'Row Number': r.row,
        ...r.data,
        'Error': r.error || 'Unknown error',
      }));

    if (failedRows.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(failedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_Error_Report.csv`);
  };

  const successCount = importResults?.filter(r => r.success).length || 0;
  const failCount = importResults?.filter(r => !r.success).length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Import Results Summary */}
          {importResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{successCount}</p>
                    <p className="text-sm text-muted-foreground">Records imported</p>
                  </div>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{failCount}</p>
                    <p className="text-sm text-muted-foreground">Records failed</p>
                  </div>
                </div>
              </div>

              {failCount > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Failed Records
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadErrorReport}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Error Report
                    </Button>
                  </div>
                  <ScrollArea className="max-h-32">
                    <ul className="text-xs text-destructive/80 space-y-1">
                      {importResults
                        .filter(r => !r.success)
                        .slice(0, 5)
                        .map((result, i) => (
                          <li key={i}>
                            • Row {result.row}: {result.error}
                          </li>
                        ))}
                      {failCount > 5 && (
                        <li className="text-muted-foreground">
                          ... and {failCount - 5} more errors
                        </li>
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* File Upload Area - only show before import results */}
          {!importResults && (
            <>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                {fileName ? (
                  <p className="text-sm text-foreground font-medium">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm text-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </>
                )}
              </div>

              {/* Download Template Button */}
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>

              {/* Expected Fields */}
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Expected columns: </span>
                {fields.map((f, i) => (
                  <span key={f.key}>
                    {f.label}
                    {f.required && <span className="text-destructive">*</span>}
                    {i < fields.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Validation Errors
                  </div>
                  <ul className="text-xs text-destructive/80 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {parsedData.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Preview ({parsedData.length} records)
                  </div>
                  <ScrollArea className="h-48 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          {fields.slice(0, 5).map((field) => (
                            <TableHead key={field.key}>{field.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            {fields.slice(0, 5).map((field) => (
                              <TableCell key={field.key} className="max-w-32 truncate">
                                {row[field.key] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {parsedData.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing first 10 of {parsedData.length} records
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!importResults && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || importing || errors.length > 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${parsedData.length} Records`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

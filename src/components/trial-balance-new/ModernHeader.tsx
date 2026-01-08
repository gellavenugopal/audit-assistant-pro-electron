import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Database,
  Upload,
  Download,
  Settings,
  RefreshCw,
  ChevronDown,
  Calendar,
  FileText,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface ModernHeaderProps {
  // Connection & Settings
  odbcPort: string;
  onOdbcPortChange: (port: string) => void;
  fromDate: string;
  onFromDateChange: (date: string) => void;
  toDate: string;
  onToDateChange: (date: string) => void;
  onTallyImport: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  
  // Import/Export
  onExcelImport: () => void;
  onExportTemplate: () => void;
  onExcelExport: () => void;
  
  // Processing
  onAutoClassify: () => void;
  onBulkUpdate: () => void;
  onClassificationManager: () => void;
  hasData: boolean;
  selectedCount: number;
  
  // Output
  onFinancialStatements: () => void;
  onSave: () => void;
  onClear: () => void;
}

export function ModernHeader({
  odbcPort,
  onOdbcPortChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onTallyImport,
  isConnecting,
  isConnected,
  onExcelImport,
  onExportTemplate,
  onExcelExport,
  onAutoClassify,
  onBulkUpdate,
  onClassificationManager,
  hasData,
  selectedCount,
  onFinancialStatements,
  onSave,
  onClear,
}: ModernHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Actions */}
        <div className="flex items-center gap-2">
          {/* Import Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Upload className="w-4 h-4 mr-2" />
                Import
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onTallyImport} disabled={isConnecting}>
                <Database className="w-4 h-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'From Tally (ODBC)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExcelImport}>
                <Upload className="w-4 h-4 mr-2" />
                From Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Process Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAutoClassify}
            disabled={!hasData}
            className="h-8"
            title="Auto-Classify (Ctrl+R)"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Auto-Classify
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onBulkUpdate}
            disabled={!hasData || selectedCount === 0}
            className="h-8"
            title="Bulk Update (Ctrl+B)"
          >
            <Settings className="w-4 h-4 mr-2" />
            Update {selectedCount > 0 && `(${selectedCount})`}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={!hasData}
                className="h-8"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onFinancialStatements}>
                <FileText className="w-4 h-4 mr-2" />
                Generate Financial Statements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExcelExport}>
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Connection & Settings */}
        <div className="flex items-center gap-3">
          {/* Date Range Compact */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Calendar className="w-3 h-3 mr-1.5" />
                {fromDate && toDate ? (
                  <>
                    {new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} -{' '}
                    {new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </>
                ) : (
                  'Set Date Range'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Financial Year Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromDateChange(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => onToDateChange(e.target.value)}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tally Status */}
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-xs">
            <Database className={cn(
              "w-3 h-3",
              isConnected ? "text-green-600" : "text-gray-400"
            )} />
            <span className={cn(
              "font-medium",
              isConnected ? "text-green-700" : "text-gray-500"
            )}>
              {isConnected ? 'Tally Connected' : 'Not Connected'}
            </span>
          </div>

          {/* Settings */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Connection Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="odbc-port">Tally ODBC Port</Label>
                  <Input
                    id="odbc-port"
                    type="text"
                    value={odbcPort}
                    onChange={(e) => onOdbcPortChange(e.target.value)}
                    placeholder="9000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Default port for Tally ODBC connection (usually 9000)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onTallyImport}
                    disabled={isConnecting}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClassificationManager} disabled={!hasData}>
                <Settings className="w-4 h-4 mr-2" />
                Classification Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={!hasData}>
                <Save className="w-4 h-4 mr-2" />
                Save Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onClear} 
                disabled={!hasData}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

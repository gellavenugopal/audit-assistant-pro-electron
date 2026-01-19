import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Database,
  Upload,
  RefreshCw,
  Settings,
  BarChart3,
  Download,
  Save,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RibbonProps {
  // Input section
  odbcPort: string;
  onOdbcPortChange: (port: string) => void;
  fromDate: string;
  onFromDateChange: (date: string) => void;
  toDate: string;
  onToDateChange: (date: string) => void;
  onTallyImport: () => void;
  onExcelImport: () => void;
  onExportTemplate: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  
  // Processing section
  onAutoClassify: () => void;
  onBulkUpdate: () => void;
  onClassificationManager: () => void;
  hasData: boolean;
  selectedCount: number;
  
  // Output section
  onExcelExport: () => void;
  onSave: () => void;
  onClear: () => void;
}

export function Ribbon({
  odbcPort,
  onOdbcPortChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onTallyImport,
  onExcelImport,
  onExportTemplate,
  isConnecting,
  isConnected,
  onAutoClassify,
  onBulkUpdate,
  onClassificationManager,
  hasData,
  selectedCount,
  onExcelExport,
  onSave,
  onClear,
}: RibbonProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'data' | 'view'>('data');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Alt + H for Home tab
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTab('home');
      }
      // Alt + D for Data tab
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTab('data');
      }
      // Alt + V for View tab
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setActiveTab('view');
      }

      // Ctrl shortcuts (only when not in input)
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'o': // Ctrl+O = Open/Import
            e.preventDefault();
            onExcelImport();
            break;
          case 's': // Ctrl+S = Save
            e.preventDefault();
            if (hasData) onSave();
            break;
          case 'e': // Ctrl+E = Export
            e.preventDefault();
            if (hasData) onExcelExport();
            break;
          case 'r': // Ctrl+R = Refresh/Auto-Classify
            e.preventDefault();
            if (hasData) onAutoClassify();
            break;
          case 'b': // Ctrl+B = Bulk Update
            e.preventDefault();
            if (hasData && selectedCount > 0) onBulkUpdate();
            break;
          case 'k': // Ctrl+K = Classification Manager
            e.preventDefault();
            if (hasData) onClassificationManager();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasData, selectedCount, onExcelImport, onExportTemplate, onSave, onExcelExport, onAutoClassify, onBulkUpdate, onClassificationManager]);

  return (
    <div className="border-b bg-white shadow-sm">
      {/* Ribbon Tabs */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setActiveTab('home')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'home'
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <span className="underline decoration-dotted">H</span>ome
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'data'
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <span className="underline decoration-dotted">D</span>ata
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'view'
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <span className="underline decoration-dotted">V</span>iew
        </button>
      </div>

      {/* Ribbon Content */}
      <div className="p-2 bg-white">
        {activeTab === 'home' && (
          <div className="flex items-center gap-6">
            {/* Clipboard Group */}
            <div className="flex flex-col border-r pr-4">
              <Label className="text-xs text-gray-500 mb-1 px-2">Clipboard</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExcelImport}
                  className="h-8 px-3"
                  title="Import Excel (Ctrl+O)"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportTemplate}
                  className="h-8 px-3"
                  title="Download Import Template"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Template
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExcelExport}
                  disabled={!hasData}
                  className="h-8 px-3"
                  title="Export Excel (Ctrl+E)"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {/* Data Group */}
            <div className="flex flex-col border-r pr-4">
              <Label className="text-xs text-gray-500 mb-1 px-2">Data</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAutoClassify}
                  disabled={!hasData}
                  className="h-8 px-3"
                  title="Auto-Classify (Ctrl+R)"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Auto-Classify
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBulkUpdate}
                  disabled={!hasData || selectedCount === 0}
                  className="h-8 px-3"
                  title="Bulk Update (Ctrl+B)"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Bulk Update
                  {selectedCount > 0 && (
                    <span className="ml-1 text-xs">({selectedCount})</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClassificationManager}
                  disabled={!hasData}
                  className="h-8 px-3"
                  title="Classification Manager (Ctrl+K)"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Classification
                </Button>
              </div>
            </div>

            {/* File Group */}
            <div className="flex flex-col">
              <Label className="text-xs text-gray-500 mb-1 px-2">File</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  disabled={!hasData}
                  className="h-8 px-3 text-destructive hover:text-destructive"
                  title="Clear All Data"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex items-center gap-6">
            {/* Connection Group */}
            <div className="flex flex-col border-r pr-4">
              <Label className="text-xs text-gray-500 mb-1 px-2">Connection</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="text-xs text-gray-500 mb-0.5">ODBC Port</Label>
                  <Input
                    type="text"
                    value={odbcPort}
                    onChange={(e) => onOdbcPortChange(e.target.value)}
                    className="h-7 w-20 text-xs"
                  />
                </div>
                <Button
                  variant={isConnected ? "default" : "outline"}
                  size="sm"
                  onClick={onTallyImport}
                  disabled={isConnecting}
                  className="h-7 px-3"
                  title="Connect to Tally"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Connecting
                    </>
                  ) : isConnected ? (
                    <>
                      <Database className="w-3 h-3 mr-1" />
                      Tally
                    </>
                  ) : (
                    <>
                      <Database className="w-3 h-3 mr-1" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Date Range Group */}
            <div className="flex flex-col border-r pr-4">
              <Label className="text-xs text-gray-500 mb-1 px-2">Date Range</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="text-xs text-gray-500 mb-0.5">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => onFromDateChange(e.target.value)}
                    className="h-7 w-32 text-xs"
                  />
                </div>
                <div className="flex flex-col">
                  <Label className="text-xs text-gray-500 mb-0.5">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => onToDateChange(e.target.value)}
                    className="h-7 w-32 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Import Group */}
            <div className="flex flex-col">
              <Label className="text-xs text-gray-500 mb-1 px-2">Import</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExcelImport}
                  className="h-7 px-3"
                  title="Import from Excel (Ctrl+O)"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportTemplate}
                  className="h-7 px-3"
                  title="Download Import Template"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <Label className="text-xs text-gray-500 mb-1 px-2">View Options</Label>
              <div className="text-sm text-gray-600 px-2">
                View customization options coming soon
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


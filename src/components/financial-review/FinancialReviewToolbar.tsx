import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { ChevronDown, Cog, Database, Download, Plus, Save, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import type { ToastProps } from '@/components/ui/toast';

type FinancialReviewToolbarProps = {
  activeTab: string;
  isFetching: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  importPeriodType: 'current' | 'previous';
  visiblePeriodLabel: string;
  classificationRulesCount: number;
  selectedFilteredCount: number;
  stockSelectedCount: number;
  selectedRowIndicesSize: number;
  currentDataLength: number;
  filteredDataLength: number;
  actualDataLength: number;
  currentStockDataLength: number;
  searchTerm: string;
  groupFilter: string;
  balanceFilter: string;
  numberScale: string;
  onSearchChange: (value: string) => void;
  onOpenFilterModal: () => void;
  onOpenRulesBot: () => void;
  onOpenEntityDialog: () => void;
  onOpenOdbcDialog: () => void;
  onOpenBsplHeads: () => void;
  onOpenTableSettings: () => void;
  onOpenNoteNumberDialog: () => void;
  onOpenVariablesDialog: () => void;
  onOpenAddLineDialog: () => void;
  onDeleteSelected: () => void;
  onConnectTally: () => void;
  onExcelImport: () => void;
  onExportTemplate: () => void;
  onExportActualTB: () => void;
  onExportClassifiedTB: () => void;
  onBulkUpdate: () => void;
  onSave: () => void;
  onSaveNotePreviewDefaults: () => void;
  onClearAll: () => void;
  onSetImportPeriodType: (value: 'current' | 'previous') => void;
  onReapplyAutoClassification: () => void;
  onSaveManualRules: () => void;
  hasManualRows: boolean;
  onSetNumberScale: (value: string) => void;
  toast: (props: ToastProps) => void;
};

export const FinancialReviewToolbar = React.memo((props: FinancialReviewToolbarProps) => {
  const {
    activeTab,
    isFetching,
    isConnecting,
    isConnected,
    importPeriodType,
    visiblePeriodLabel,
    classificationRulesCount,
    selectedFilteredCount,
    stockSelectedCount,
    selectedRowIndicesSize,
    currentDataLength,
    filteredDataLength,
    actualDataLength,
    currentStockDataLength,
    searchTerm,
    groupFilter,
    balanceFilter,
    numberScale,
    onSearchChange,
    onOpenFilterModal,
    onOpenRulesBot,
    onOpenEntityDialog,
    onOpenOdbcDialog,
    onOpenBsplHeads,
    onOpenTableSettings,
    onOpenNoteNumberDialog,
    onOpenVariablesDialog,
    onOpenAddLineDialog,
    onDeleteSelected,
    onConnectTally,
    onExcelImport,
    onExportTemplate,
    onExportActualTB,
    onExportClassifiedTB,
    onBulkUpdate,
    onSave,
    onSaveNotePreviewDefaults,
    onClearAll,
    onSetImportPeriodType,
    onReapplyAutoClassification,
    onSaveManualRules,
    hasManualRows,
    onSetNumberScale,
    toast,
  } = props;

  return (
    <>
      <div className="flex items-center justify-between px-1 py-0.5 bg-white border-b" style={{ minHeight: '28px' }}>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                <Upload className="w-3 h-3 mr-1.5" />
                Import
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onConnectTally} disabled={isFetching || isConnecting}>
                <Database className="w-3 h-3 mr-2" />
                {isFetching || isConnecting ? 'Connecting...' : 'From Tally (ODBC)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExcelImport}>
                <Upload className="w-3 h-3 mr-2" />
                From Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportTemplate}>
                <Download className="w-3 h-3 mr-2" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const activeSelectionCount = activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount;
              if (activeSelectionCount === 0) {
                toast({
                  title: 'No Selection',
                  description:
                    activeTab === 'stock-items'
                      ? 'Please select stock items to update'
                      : 'Please select visible filtered rows to update',
                  variant: 'destructive',
                });
                return;
              }
              onBulkUpdate();
            }}
            disabled={activeTab === 'stock-items' ? stockSelectedCount === 0 : currentDataLength === 0 || selectedFilteredCount === 0}
            className="h-7 text-xs px-2"
          >
            <Settings className="w-3 h-3 mr-1.5" />
            {activeTab === 'stock-items'
              ? stockSelectedCount === 1
                ? 'Update Stock'
                : 'Bulk Update Stock'
              : selectedFilteredCount === 1
                ? 'Update Ledger'
                : 'Bulk Update Ledgers'}{' '}
            {(activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount) > 0 &&
              `(${activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount})`}
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenRulesBot} className="h-8">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Rules Bot {classificationRulesCount > 0 ? `(${classificationRulesCount})` : ''}
          </Button>

          <Button variant="outline" size="sm" onClick={onReapplyAutoClassification} disabled={currentDataLength === 0} className="h-8">
            Auto Apply
          </Button>
          <Button variant={hasManualRows ? 'default' : 'outline'} size="sm" onClick={onSaveManualRules} disabled={!hasManualRows} className="h-8">
            Save Manual Rules
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={currentDataLength === 0} className="h-7 text-xs px-2">
                <Download className="w-3 h-3 mr-1.5" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onExportActualTB}>
                <Download className="w-3 h-3 mr-2" />
                Export Actual TB to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportClassifiedTB}>
                <Download className="w-3 h-3 mr-2" />
                Export Classified TB to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeTab !== 'stock-items' && (
            <div className="flex items-center gap-1 rounded border bg-white p-0.5">
              <Button
                type="button"
                size="sm"
                variant={importPeriodType === 'current' ? 'default' : 'ghost'}
                className="h-6 px-2 text-[10px]"
                onClick={() => onSetImportPeriodType('current')}
              >
                Current
              </Button>
              <Button
                type="button"
                size="sm"
                variant={importPeriodType === 'previous' ? 'default' : 'ghost'}
                className="h-6 px-2 text-[10px]"
                onClick={() => onSetImportPeriodType('previous')}
              >
                Previous
              </Button>
            </div>
          )}

          {visiblePeriodLabel && (
            <Badge variant="secondary" className="h-6 px-2 text-[10px]">
              {visiblePeriodLabel}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Database className="w-3 h-3" />
            {isConnected ? 'Tally Connected' : 'Not Connected'}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenEntityDialog}>
                <Cog className="w-4 h-4 mr-2" />
                Configure Entity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenOdbcDialog}>
                <Database className="w-4 h-4 mr-2" />
                ODBC Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenBsplHeads}>
                <Settings className="w-4 h-4 mr-2" />
                Manage BSPL Heads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenTableSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Table Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={currentDataLength === 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveNotePreviewDefaults}>
                <Save className="w-4 h-4 mr-2" />
                Save Note Preview Defaults
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenNoteNumberDialog}>
                <Settings className="w-4 h-4 mr-2" />
                Note Number Start
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenVariablesDialog}>
                <Settings className="w-4 h-4 mr-2" />
                Statement Variables
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onClearAll}
                disabled={currentDataLength === 0 && actualDataLength === 0 && currentStockDataLength === 0}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 py-0.5 bg-white border-b" style={{ minHeight: '28px' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search ledgers, groups..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-7 pl-7 text-xs"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onSearchChange('');
              }
            }}
          />
        </div>

        <Button variant="outline" size="sm" onClick={onOpenFilterModal} className="h-7 text-xs px-2">
          <Settings className="w-4 h-4 mr-2" />
          Filters
          {(() => {
            const activeCount = [groupFilter !== 'all', balanceFilter !== 'all'].filter(Boolean).length;
            return activeCount > 0 ? (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeCount}
              </Badge>
            ) : null;
          })()}
        </Button>

        <div className="flex items-center gap-2 flex-1" />

        <div className="flex items-center gap-2">
          {(activeTab === 'stock-items' ? stockSelectedCount : selectedFilteredCount) > 0 && (
            <Badge variant="default" className="h-7 px-2 text-xs">
              {activeTab === 'stock-items'
                ? `${stockSelectedCount} selected`
                : `${selectedFilteredCount} of ${filteredDataLength} selected`}
            </Badge>
          )}
          <Select value={numberScale} onValueChange={onSetNumberScale}>
            <SelectTrigger className="h-7 px-2 text-xs w-[150px]">
              <SelectValue placeholder="Scale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Actual</SelectItem>
              <SelectItem value="tens">Tens (0)</SelectItem>
              <SelectItem value="hundreds">Hundreds (00)</SelectItem>
              <SelectItem value="thousands">Thousands ('000)</SelectItem>
              <SelectItem value="lakhs">Lakhs ('00000)</SelectItem>
              <SelectItem value="millions">Millions (000000)</SelectItem>
              <SelectItem value="crores">Crores (0000000)</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={onOpenAddLineDialog} className="h-7 text-xs px-2">
            <Plus className="w-4 h-4 mr-1" />
            {activeTab === 'stock-items' ? 'Add Item' : 'Add Ledger'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeleteSelected}
            className="h-7 text-xs px-2"
            disabled={activeTab === 'stock-items' ? stockSelectedCount === 0 : selectedRowIndicesSize === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      </div>
    </>
  );
});
FinancialReviewToolbar.displayName = 'FinancialReviewToolbar';

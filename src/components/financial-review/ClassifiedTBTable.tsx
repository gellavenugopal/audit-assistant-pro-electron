import React, { useMemo } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { ColumnFilter } from '@/components/ui/column-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LedgerRow } from '@/services/trialBalanceNewClassification';
import { InlineCombobox } from '@/components/financial-review/InlineCombobox';
import { useMeasuredElementHeight } from '@/hooks/useMeasuredElementHeight';
import { useMeasuredElementWidth } from '@/hooks/useMeasuredElementWidth';

type ClassifiedTBTableProps = {
  rows: LedgerRow[];
  allRows: LedgerRow[];
  keyToIndexMap: Map<string, number>;
  selectedRowIndices: Set<number>;
  selectedFilteredCount: number;
  setSelectedRowIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleRowSelection: (index: number, event?: React.MouseEvent) => void;
  getColumnWidth: (columnName: string) => number;
  getColumnFontSize: (columnName: string) => number;
  getClassifiedRowHeight: () => number;
  getClassifiedTbColumnValues: (column: string) => (string | number)[];
  classifiedTbColumnFilters: Record<string, Set<string | number>>;
  classifiedTbSortColumn: string | null;
  classifiedTbSortDirection: 'asc' | 'desc' | null;
  handleClassifiedTbFilterChange: (column: string, values: Set<string | number>) => void;
  handleClassifiedTbSort: (column: string, direction: 'asc' | 'desc' | null) => void;
  updateRowAtIndex: (index: number, updates: Partial<LedgerRow>) => void;
  getFilteredH2Options: (row: LedgerRow) => string[];
  getFilteredH3Options: (row: LedgerRow, options: string[]) => string[];
  resolveH2Key: (h1?: string, h2?: string) => string;
  bsplOptions: {
    h1Options: string[];
    h3Options: Record<string, Record<string, string[]>>;
  };
  getMappingStatus: (row: LedgerRow) => string;
  getConfidenceStatus: (row: LedgerRow) => string;
  getStatusLabel: (row: LedgerRow) => string;
  focusedClassifiedRowIndex: number | null;
  setFocusedClassifiedRowIndex: React.Dispatch<React.SetStateAction<number | null>>;
  formatNumber: (value?: number) => string;
  cn: (...inputs: Array<string | false | null | undefined>) => string;
};

const EMPTY_STYLE: React.CSSProperties = Object.freeze({});

const ClassifiedTBRow = React.memo(
  ({ index, style, data }: ListChildComponentProps<{
    rows: LedgerRow[];
    keyToIndexMap: Map<string, number>;
    selectedRowIndices: Set<number>;
    toggleRowSelection: (index: number, event?: React.MouseEvent) => void;
    getColumnWidth: (columnName: string) => number;
    getColumnFontSize: (columnName: string) => number;
    updateRowAtIndex: (index: number, updates: Partial<LedgerRow>) => void;
    getFilteredH2Options: (row: LedgerRow) => string[];
    getFilteredH3Options: (row: LedgerRow, options: string[]) => string[];
    resolveH2Key: (h1?: string, h2?: string) => string;
    bsplOptions: {
      h1Options: string[];
      h3Options: Record<string, Record<string, string[]>>;
    };
    getMappingStatus: (row: LedgerRow) => string;
    getConfidenceStatus: (row: LedgerRow) => string;
    getStatusLabel: (row: LedgerRow) => string;
    focusedClassifiedRowIndex: number | null;
    setFocusedClassifiedRowIndex: React.Dispatch<React.SetStateAction<number | null>>;
    formatNumber: (value?: number) => string;
    cn: (...inputs: Array<string | false | null | undefined>) => string;
    rowHeight: number;
  }>) => {
    const {
      rows,
      keyToIndexMap,
      selectedRowIndices,
      toggleRowSelection,
      getColumnWidth,
      getColumnFontSize,
      updateRowAtIndex,
      getFilteredH2Options,
      getFilteredH3Options,
      resolveH2Key,
      bsplOptions,
      getMappingStatus,
      getConfidenceStatus,
      getStatusLabel,
      focusedClassifiedRowIndex,
      setFocusedClassifiedRowIndex,
      formatNumber,
      cn,
    } = data;

    const row = rows[index];
    if (!row) return null;

    const key = row['Composite Key'];
    const originalIndex = key ? (keyToIndexMap.get(String(key)) ?? -1) : -1;
    const isSelected = originalIndex !== -1 && selectedRowIndices.has(originalIndex);
    const isFocused = focusedClassifiedRowIndex === originalIndex;
    const mappingStatus = getMappingStatus(row);
    const rowBaseBackground = index % 2 === 0 ? 'bg-[#eaf8ef]' : 'bg-[#f7fff8]';

    return (
      <div
        className={cn(
          'cursor-pointer transition-colors border-b border-neutral-200 flex w-full',
          isSelected ? 'bg-[#dfe8ff]' : rowBaseBackground,
        )}
        style={{ ...style, display: 'flex', height: data.rowHeight, minHeight: data.rowHeight }}
        onClick={(event) => {
          setFocusedClassifiedRowIndex(originalIndex);
          toggleRowSelection(originalIndex, event);
        }}
        onFocus={() => setFocusedClassifiedRowIndex(originalIndex)}
        tabIndex={0}
      >
        <div className="p-0 flex items-center justify-center" style={{ width: 28 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={(event) => {
              event.stopPropagation();
              toggleRowSelection(originalIndex, event as unknown as React.MouseEvent);
            }}
          />
        </div>
        <div
          className="font-medium truncate px-3 py-1.5 text-sm"
          style={{ width: getColumnWidth('Ledger Name'), fontSize: `${getColumnFontSize('Ledger Name')}px` }}
          title={row['Ledger Name']}
        >
          {row['Ledger Name']}
        </div>
        <div
          className="text-gray-600 truncate px-3 py-1.5 text-sm"
          style={{ width: getColumnWidth('Parent Group'), fontSize: `${getColumnFontSize('Parent Group')}px` }}
          title={row['Parent Group'] || row['Primary Group'] || '-'}
        >
          {row['Parent Group'] || row['Primary Group'] || '-'}
        </div>
        <div
          className="truncate px-3 py-1.5 text-sm"
          style={{ width: getColumnWidth('Primary Group'), fontSize: `${getColumnFontSize('Primary Group')}px` }}
          title={row['Primary Group']}
        >
          {row['Primary Group']}
        </div>
        <div
          className="text-right px-3 py-1.5 text-sm"
          style={{ width: getColumnWidth('Opening Balance'), fontSize: `${getColumnFontSize('Opening Balance')}px` }}
        >
          {formatNumber(row['Opening Balance'])}
        </div>
        <div
          className="text-right font-medium px-3 py-1.5 text-sm"
          style={{ width: getColumnWidth('Closing Balance'), fontSize: `${getColumnFontSize('Closing Balance')}px` }}
        >
          {formatNumber(row['Closing Balance'])}
        </div>
        <div className="px-3 py-1.5 text-sm" style={{ width: getColumnWidth('H1'), fontSize: `${getColumnFontSize('H1')}px` }}>
          <Select
            value={row['H1'] || ''}
            onValueChange={(value) => updateRowAtIndex(originalIndex, { H1: value, H2: '', H3: '' })}
          >
            <SelectTrigger className="h-4 px-1" style={{ fontSize: `${getColumnFontSize('H1')}px` }}>
              <SelectValue placeholder="Select H1" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
              {bsplOptions.h1Options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="px-3 py-1.5 text-sm truncate text-left"
          style={{ width: getColumnWidth('H2'), fontSize: `${getColumnFontSize('H2')}px` }}
        >
          <InlineCombobox
            value={row['H2'] || ''}
            options={[...getFilteredH2Options(row), 'User_Defined']}
            placeholder={row['H1'] ? 'H2' : 'Select H1'}
            disabled={!row['H1']}
            onChange={(value) => updateRowAtIndex(originalIndex, { H2: value })}
            className="h-4 px-1 w-full text-gray-900 leading-none py-0"
            inputStyle={{ fontSize: `${getColumnFontSize('H2')}px`, textAlign: 'left' }}
          />
        </div>
        <div
          className="px-3 py-1.5 text-sm truncate text-left"
          style={{ width: getColumnWidth('H3'), fontSize: `${getColumnFontSize('H3')}px` }}
        >
          {(() => {
            const resolvedH2 = resolveH2Key(row['H1'], row['H2']);
            const baseOptions = (bsplOptions.h3Options[row['H1'] || ''] || {})[resolvedH2 || row['H2'] || ''] || [];
            const options = getFilteredH3Options(row, baseOptions);
            return (
              <InlineCombobox
                value={row['H3'] || ''}
                options={[...options, 'User_Defined']}
                placeholder={row['H1'] && row['H2'] ? 'H3' : 'Select H1/H2'}
                disabled={!row['H1'] || !row['H2']}
                onChange={(value) => updateRowAtIndex(originalIndex, { H3: value })}
                className="h-4 px-1 w-full text-gray-900 leading-none py-0"
                inputStyle={{ fontSize: `${getColumnFontSize('H3')}px`, textAlign: 'left' }}
              />
            );
          })()}
        </div>
        <div className="px-2 py-1" style={{ width: getColumnWidth('Status'), fontSize: `${getColumnFontSize('Status')}px` }}>
          {(() => {
            const mapping = getMappingStatus(row);
            const confidence = getConfidenceStatus(row);
            const label = getStatusLabel(row);
            if (confidence === 'Confident Auto') {
              return (
                <Badge
                  variant="secondary"
                  title={`${mapping} - Auto classification looks complete`}
                  className="h-4 px-1 text-[10px]"
                >
                  {label}
                </Badge>
              );
            }
            if (confidence === 'Review Auto') {
              return (
                <Badge
                  variant="outline"
                  title={`${mapping} - Auto classification needs review`}
                  className="h-4 px-1 text-[10px]"
                >
                  {label}
                </Badge>
              );
            }
            if (confidence === 'Manual') {
              return (
                <Badge variant="outline" title={`${mapping} - Manually classified`} className="h-4 px-1 text-[10px]">
                  {label}
                </Badge>
              );
            }
            return <span className="text-muted-foreground">{label}</span>;
          })()}
        </div>
      </div>
    );
  },
);
ClassifiedTBRow.displayName = 'ClassifiedTBRow';

export const ClassifiedTBTable = React.memo((props: ClassifiedTBTableProps) => {
  const {
    rows,
    allRows,
    keyToIndexMap,
    selectedFilteredCount,
    selectedRowIndices,
    setSelectedRowIndices,
    getColumnWidth: getBaseColumnWidth,
    getColumnFontSize,
    getClassifiedRowHeight,
    getClassifiedTbColumnValues,
    classifiedTbColumnFilters,
    classifiedTbSortColumn,
    classifiedTbSortDirection,
    handleClassifiedTbFilterChange,
    handleClassifiedTbSort,
  } = props;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const containerHeight = useMeasuredElementHeight(containerRef);
  const headerHeight = useMeasuredElementHeight(headerRef);
  const containerWidth = useMeasuredElementWidth(containerRef);
  const rowHeight = getClassifiedRowHeight();
  const listHeight = Math.max(containerHeight - headerHeight, rowHeight);

  const headerColumns = useMemo(
    () => [
      {
        label: 'Ledger Name',
        column: 'Ledger Name',
        fontKey: 'Ledger Name',
        justify: 'items-center',
        stickyLeft: 28,
        stickyZ: 19,
        baseWidth: getBaseColumnWidth('Ledger Name'),
        isNumeric: false,
      },
      {
        label: 'Parent Group',
        column: 'Parent Group',
        fontKey: 'Parent Group',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('Parent Group'),
      },
      {
        label: 'Primary Group',
        column: 'Primary Group',
        fontKey: 'Primary Group',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('Primary Group'),
      },
      {
        label: 'Opening',
        column: 'Opening Balance',
        fontKey: 'Opening Balance',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('Opening Balance'),
        isNumeric: true,
      },
      {
        label: 'Closing',
        column: 'Closing Balance',
        fontKey: 'Closing Balance',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('Closing Balance'),
        isNumeric: true,
      },
      {
        label: 'H1',
        column: 'H1',
        fontKey: 'H1',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('H1'),
      },
      {
        label: 'H2',
        column: 'H2',
        fontKey: 'H2',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('H2'),
      },
      {
        label: 'H3',
        column: 'H3',
        fontKey: 'H3',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('H3'),
      },
      {
        label: 'Status',
        column: 'Status',
        fontKey: 'Status',
        justify: 'items-center',
        baseWidth: getBaseColumnWidth('Status'),
      },
    ],
    [getBaseColumnWidth],
  );

  const baseWidthMap = useMemo(
    () =>
      headerColumns.reduce((acc, column) => {
        acc[column.column] = column.baseWidth;
        return acc;
      }, {} as Record<string, number>),
    [headerColumns],
  );

  const adjustedColumnWidths = useMemo(() => {
    const totalBaseWidth = headerColumns.reduce((sum, column) => sum + column.baseWidth, 0);
    if (!containerWidth || totalBaseWidth === 0) {
      return baseWidthMap;
    }

    const extraWidth = Math.max(0, containerWidth - totalBaseWidth);
    if (extraWidth === 0) {
      return baseWidthMap;
    }

    return headerColumns.reduce((acc, column) => {
      const ratio = totalBaseWidth ? column.baseWidth / totalBaseWidth : 1 / headerColumns.length;
      acc[column.column] = column.baseWidth + extraWidth * ratio;
      return acc;
    }, {} as Record<string, number>);
  }, [baseWidthMap, containerWidth, headerColumns]);

  const getColumnWidth = React.useCallback(
    (columnName: string) => adjustedColumnWidths[columnName] ?? baseWidthMap[columnName] ?? 0,
    [adjustedColumnWidths, baseWidthMap],
  );

  const headerColumnsWithWidth = useMemo(
    () => headerColumns.map((column) => ({ ...column, width: getColumnWidth(column.column) })),
    [headerColumns, getColumnWidth],
  );

  const itemData = useMemo(
    () => ({
      rows,
      keyToIndexMap,
      selectedRowIndices,
      toggleRowSelection: props.toggleRowSelection,
      getColumnWidth,
      getColumnFontSize,
      updateRowAtIndex: props.updateRowAtIndex,
      getFilteredH2Options: props.getFilteredH2Options,
      getFilteredH3Options: props.getFilteredH3Options,
      resolveH2Key: props.resolveH2Key,
      bsplOptions: props.bsplOptions,
      getMappingStatus: props.getMappingStatus,
      getConfidenceStatus: props.getConfidenceStatus,
      getStatusLabel: props.getStatusLabel,
      focusedClassifiedRowIndex: props.focusedClassifiedRowIndex,
      setFocusedClassifiedRowIndex: props.setFocusedClassifiedRowIndex,
      formatNumber: props.formatNumber,
      cn: props.cn,
      rowHeight,
    }),
    [
      rows,
      keyToIndexMap,
      selectedRowIndices,
      props.toggleRowSelection,
      getColumnWidth,
      getColumnFontSize,
      props.updateRowAtIndex,
      props.getFilteredH2Options,
      props.getFilteredH3Options,
      props.resolveH2Key,
      props.bsplOptions,
      props.getMappingStatus,
      props.getConfidenceStatus,
      props.getStatusLabel,
      props.focusedClassifiedRowIndex,
      props.setFocusedClassifiedRowIndex,
      props.formatNumber,
      props.cn,
      rowHeight,
    ],
  );

  return (
    <div ref={containerRef} className="border rounded-lg overflow-hidden relative h-full w-full">
      <div
        ref={headerRef}
        className="sticky top-0 bg-white z-20 shadow-sm border-b border-gray-200"
        style={{ display: 'flex' }}
      >
        <div className="p-0 flex items-center justify-center" style={{ width: 28 }}>
          <input
            type="checkbox"
            checked={selectedFilteredCount === rows.length && rows.length > 0}
            onChange={(event) => {
              if (event.target.checked) {
                const visibleIndices = rows
                  .map((row) => {
                    const key = row['Composite Key'];
                    return key ? keyToIndexMap.get(String(key)) ?? -1 : -1;
                  })
                  .filter((idx) => idx !== -1);
                setSelectedRowIndices(new Set(visibleIndices));
              } else {
                setSelectedRowIndices(new Set());
              }
            }}
            title="Select All Visible / Deselect All"
          />
        </div>
        {headerColumnsWithWidth.map(({ label, column, width, fontKey, stickyLeft, stickyZ, justify = 'items-center', isNumeric }) => (
          <div
            key={column}
          className={`relative flex ${justify} gap-1 px-3 py-1.5`}
            style={{
              width,
              minWidth: width,
              flexShrink: 0,
              fontSize: `${getColumnFontSize(fontKey)}px`,
              position: typeof stickyLeft === 'number' ? 'sticky' : 'relative',
              left: typeof stickyLeft === 'number' ? stickyLeft : undefined,
              zIndex: typeof stickyLeft === 'number' ? stickyZ ?? 10 : undefined,
              background: stickyLeft ? 'white' : undefined,
            }}
          >
            <div className="flex items-center gap-1 whitespace-nowrap">
              {label}
              <ColumnFilter
                column={column}
                values={getClassifiedTbColumnValues(column)}
                selectedValues={classifiedTbColumnFilters[column] || new Set()}
                onFilterChange={(values) => handleClassifiedTbFilterChange(column, values)}
                sortDirection={classifiedTbSortColumn === column ? classifiedTbSortDirection : null}
                onSort={(dir) => handleClassifiedTbSort(column, dir)}
                isNumeric={isNumeric}
              />
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {allRows.length === 0 ? 'No classified data. Import from Tally to get started.' : 'No results match your search criteria.'}
        </div>
      ) : (
        <List
          height={listHeight}
          itemCount={rows.length}
          itemSize={rowHeight}
          className="w-full"
          width="100%"
          itemData={itemData}
          style={EMPTY_STYLE}
        >
          {ClassifiedTBRow}
        </List>
      )}
    </div>
  );
});
ClassifiedTBTable.displayName = 'ClassifiedTBTable';

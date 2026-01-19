import React, { useMemo } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { ColumnFilter } from '@/components/ui/column-filter';
import type { LedgerRow } from '@/services/trialBalanceNewClassification';
import { useMeasuredElementHeight } from '@/hooks/useMeasuredElementHeight';
import { useMeasuredElementWidth } from '@/hooks/useMeasuredElementWidth';

type ActualTBTableProps = {
  rows: LedgerRow[];
  allRows: LedgerRow[];
  keyToIndexMap: Map<string, number>;
  selectedRowIndices: Set<number>;
  setSelectedRowIndices: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleRowSelection: (index: number, event?: React.MouseEvent) => void;
  actualStickyOffsets: { selection: number; ledger: number };
  getActualColumnWidth: (columnName: string) => number;
  getActualFontSize: (columnName: string) => number;
  getActualRowHeight: () => number;
  getActualTbColumnValues: (column: string) => (string | number)[];
  actualTbColumnFilters: Record<string, Set<string | number>>;
  actualTbSortColumn: string | null;
  actualTbSortDirection: 'asc' | 'desc' | null;
  handleActualTbFilterChange: (column: string, values: Set<string | number>) => void;
  handleActualTbSort: (column: string, direction: 'asc' | 'desc' | null) => void;
  actualTbHandleMouseDown: (column: string, event: React.MouseEvent) => void;
  formatNumber: (value?: number) => string;
  cn: (...inputs: Array<string | false | null | undefined>) => string;
};

const EMPTY_STYLE: React.CSSProperties = Object.freeze({});

const ActualTBRow = React.memo(
  ({ index, style, data }: ListChildComponentProps<{
    rows: LedgerRow[];
    keyToIndexMap: Map<string, number>;
    selectedRowIndices: Set<number>;
    toggleRowSelection: (index: number, event?: React.MouseEvent) => void;
    actualStickyOffsets: { selection: number; ledger: number };
    getActualColumnWidth: (columnName: string) => number;
    getActualFontSize: (columnName: string) => number;
    formatNumber: (value?: number) => string;
    cn: (...inputs: Array<string | false | null | undefined>) => string;
    rowHeight: number;
  }>) => {
    const {
      rows,
      keyToIndexMap,
      selectedRowIndices,
      toggleRowSelection,
      actualStickyOffsets,
      getActualColumnWidth,
      getActualFontSize,
      formatNumber,
      cn,
    } = data;
    const row = rows[index];
    if (!row) return null;

    const key = row['Composite Key'];
    const originalIndex = key ? (keyToIndexMap.get(String(key)) ?? -1) : -1;
    const isSelected = originalIndex !== -1 && selectedRowIndices.has(originalIndex);
    return (
      <div
        className={cn(
          'cursor-pointer flex w-full border-b border-neutral-200',
          isSelected ? 'bg-[#dfe8ff]' : 'bg-white',
        )}
        style={{ ...style, display: 'flex', height: data.rowHeight, minHeight: data.rowHeight }}
        onClick={(event) => toggleRowSelection(originalIndex, event)}
      >
        <div
          className="p-0 flex items-center justify-center"
          style={{
            width: 32,
            position: 'sticky',
            left: actualStickyOffsets.selection,
            zIndex: 10,
            background: 'white',
          }}
        >
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
          className="font-medium sticky bg-white z-10 truncate px-3 py-1.5 text-sm align-middle"
          style={{
            width: getActualColumnWidth('Ledger Name'),
            fontSize: `${getActualFontSize('Ledger Name')}px`,
            position: 'sticky',
            left: actualStickyOffsets.ledger,
            zIndex: 9,
            background: 'white',
          }}
          title={row['Ledger Name']}
        >
          {row['Ledger Name']}
        </div>
        <div
          className="text-gray-600 max-w-[180px] truncate px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Parent Group'), fontSize: `${getActualFontSize('Parent Group')}px` }}
          title={row['Parent Group'] || row['Primary Group'] || '-'}
        >
          {row['Parent Group'] || row['Primary Group'] || '-'}
        </div>
        <div
          className="max-w-[180px] truncate px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Primary Group'), fontSize: `${getActualFontSize('Primary Group')}px` }}
          title={row['Primary Group']}
        >
          {row['Primary Group']}
        </div>
        <div
          className="text-right px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Opening Balance'), fontSize: `${getActualFontSize('Opening Balance')}px` }}
        >
          {formatNumber(row['Opening Balance'])}
        </div>
        <div
          className="text-right px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Debit'), fontSize: `${getActualFontSize('Debit')}px` }}
        >
          {formatNumber(row['Debit'])}
        </div>
        <div
          className="text-right px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Credit'), fontSize: `${getActualFontSize('Credit')}px` }}
        >
          {formatNumber(row['Credit'])}
        </div>
        <div
          className="text-right font-medium px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Closing Balance'), fontSize: `${getActualFontSize('Closing Balance')}px` }}
        >
          {formatNumber(row['Closing Balance'])}
        </div>
        <div
          className="px-3 py-1.5 text-sm align-middle"
          style={{ width: getActualColumnWidth('Is Revenue'), fontSize: `${getActualFontSize('Is Revenue')}px` }}
        >
          {row['Is Revenue']}
        </div>
      </div>
    );
  },
);
ActualTBRow.displayName = 'ActualTBRow';

export const ActualTBTable = React.memo((props: ActualTBTableProps) => {
  const {
    rows,
    allRows,
    keyToIndexMap,
    selectedRowIndices,
    setSelectedRowIndices,
    toggleRowSelection,
    getActualColumnWidth,
    getActualFontSize,
    getActualRowHeight,
    getActualTbColumnValues,
    actualTbColumnFilters,
    actualTbSortColumn,
    actualTbSortDirection,
    handleActualTbFilterChange,
    handleActualTbSort,
    actualTbHandleMouseDown,
    actualStickyOffsets,
  } = props;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const containerHeight = useMeasuredElementHeight(containerRef);
  const headerHeight = useMeasuredElementHeight(headerRef);
  const rowHeight = getActualRowHeight();
  const listHeight = Math.max(containerHeight - headerHeight, rowHeight);

  const itemData = useMemo(
    () => ({
      rows,
      keyToIndexMap,
      selectedRowIndices,
      toggleRowSelection,
      actualStickyOffsets,
      getActualColumnWidth,
      getActualFontSize,
      formatNumber: props.formatNumber,
      cn: props.cn,
      rowHeight,
    }),
    [
      rows,
      keyToIndexMap,
      selectedRowIndices,
      toggleRowSelection,
      actualStickyOffsets,
      getActualColumnWidth,
      getActualFontSize,
      props.formatNumber,
      props.cn,
      rowHeight,
    ],
  );

  return (
    <div ref={containerRef} className="border rounded overflow-hidden relative h-full w-full">
      <div
        ref={headerRef}
        className="sticky top-0 bg-white z-20 shadow-sm border-b border-gray-200"
        style={{ display: 'flex' }}
      >
        <div
          className="p-0 flex items-center justify-center"
          style={{
            width: 32,
            flexShrink: 0,
            position: 'sticky',
            left: actualStickyOffsets.selection,
            zIndex: 20,
            background: 'white',
          }}
        >
          <input
            type="checkbox"
            checked={selectedRowIndices.size === allRows.length && allRows.length > 0}
            onChange={(event) => {
              if (event.target.checked) {
                setSelectedRowIndices(new Set(allRows.map((_, i) => i)));
              } else {
                setSelectedRowIndices(new Set());
              }
            }}
            title="Select All / Deselect All"
          />
        </div>
        {[
          {
            label: 'Ledger Name',
            column: 'Ledger Name',
            justify: 'items-center',
            width: getActualColumnWidth('Ledger Name'),
            fontKey: 'Ledger Name',
            stickyLeft: actualStickyOffsets.ledger,
            stickyZ: 19,
          },
          {
            label: 'Parent Group',
            column: 'Parent Group',
            justify: 'items-center',
            width: getActualColumnWidth('Parent Group'),
            fontKey: 'Parent Group',
          },
          {
            label: 'Primary Group',
            column: 'Primary Group',
            justify: 'items-center',
            width: getActualColumnWidth('Primary Group'),
            fontKey: 'Primary Group',
          },
          {
            label: 'Opening',
            column: 'Opening Balance',
            justify: 'items-center',
            width: getActualColumnWidth('Opening Balance'),
            fontKey: 'Opening Balance',
            isNumeric: true,
          },
          {
            label: 'Debit',
            column: 'Debit',
            justify: 'items-center',
            width: getActualColumnWidth('Debit'),
            fontKey: 'Debit',
            isNumeric: true,
          },
          {
            label: 'Credit',
            column: 'Credit',
            justify: 'items-center',
            width: getActualColumnWidth('Credit'),
            fontKey: 'Credit',
            isNumeric: true,
          },
          {
            label: 'Closing',
            column: 'Closing Balance',
            justify: 'items-center',
            width: getActualColumnWidth('Closing Balance'),
            fontKey: 'Closing Balance',
            isNumeric: true,
          },
          {
            label: 'Is Revenue',
            column: 'Is Revenue',
            justify: 'items-center',
            width: getActualColumnWidth('Is Revenue'),
            fontKey: 'Is Revenue',
          },
        ].map(({ label, column, justify, width, fontKey, isNumeric, stickyLeft, stickyZ }) => (
          <div
            key={column}
          className={`relative flex ${justify} gap-1 px-3 py-1.5`}
            style={{
              width,
              minWidth: width,
              flexShrink: 0,
              fontSize: `${getActualFontSize(fontKey)}px`,
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
              values={getActualTbColumnValues(column)}
                selectedValues={actualTbColumnFilters[column] || new Set()}
                onFilterChange={(values) => handleActualTbFilterChange(column, values)}
                sortDirection={actualTbSortColumn === column ? actualTbSortDirection : null}
                onSort={(dir) => handleActualTbSort(column, dir)}
                isNumeric={isNumeric}
              />
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
              onMouseDown={(event) => actualTbHandleMouseDown(column, event)}
              style={{ userSelect: 'none' }}
              title="Drag to resize column"
            />
            {typeof stickyLeft === 'number' && (
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width,
                  position: 'sticky',
                  left: stickyLeft,
                  zIndex: stickyZ ?? 10,
                  background: 'white',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No data loaded. Import from Tally or Excel to get started.
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
          {ActualTBRow}
        </List>
      )}
    </div>
  );
});
ActualTBTable.displayName = 'ActualTBTable';

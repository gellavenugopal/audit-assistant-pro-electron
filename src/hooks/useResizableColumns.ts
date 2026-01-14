import { useState, useCallback, useRef, useEffect } from 'react';

export function useResizableColumns(initialWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((columnName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizingColumn(columnName);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnName] || 150;
  }, [columnWidths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizingColumn) return;
    
    const delta = e.clientX - startXRef.current;
    const newWidth = Math.max(50, startWidthRef.current + delta); // Minimum 50px
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [isResizing, resizingColumn]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    columnWidths,
    handleMouseDown,
    isResizing,
    resizingColumn
  };
}

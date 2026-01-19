import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { openExportedFileInDownloads } from '@/utils/openExportedFile';

type ExportedFileDialogContextValue = {
  confirmExportedFile: (filename: string) => Promise<void>;
};

const ExportedFileDialogContext = createContext<ExportedFileDialogContextValue | null>(null);

export const ExportedFileDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{ open: boolean; filename: string }>({ open: false, filename: '' });
  const pendingResolveRef = useRef<(() => void) | null>(null);
  const toast = useToast();

  const confirmExportedFile = useCallback((filename: string) => {
    if (!filename) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      pendingResolveRef.current = resolve;
      setDialogState({ open: true, filename });
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
    if (pendingResolveRef.current) {
      pendingResolveRef.current();
      pendingResolveRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    const filename = dialogState.filename;
    setDialogState((prev) => ({ ...prev, open: false }));
    const resolve = pendingResolveRef.current;
    pendingResolveRef.current = null;
    const error = await openExportedFileInDownloads(filename);
    if (error) {
      const normalized = error.toLowerCase();
      const variant = normalized.includes('failed') || normalized.includes('could not') ? 'destructive' : 'default';
      toast({
        title: 'Open File',
        description: error,
        variant,
      });
    }
    resolve?.();
  }, [dialogState.filename, toast]);

  return (
    <ExportedFileDialogContext.Provider value={{ confirmExportedFile }}>
      {children}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open Exported File</DialogTitle>
            <DialogDescription>
              {dialogState.filename
                ? `"${dialogState.filename}" has been exported. Would you like to open it now?`
                : 'The export finished. Would you like to open the file now?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Open File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ExportedFileDialogContext.Provider>
  );
};

export const useExportedFileDialog = () => {
  const context = useContext(ExportedFileDialogContext);
  if (!context) {
    throw new Error('useExportedFileDialog must be used within ExportedFileDialogProvider');
  }
  return context;
};

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';
import { navigationShortcuts } from '@/hooks/useKeyboardShortcuts';

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

const ShortcutRow = ({ keys, description }: ShortcutRowProps) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-foreground">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="flex items-center gap-1">
          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-muted-foreground">+</span>}
        </span>
      ))}
    </div>
  </div>
);

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + ? or Ctrl/Cmd + / to open shortcuts dialog
      if ((event.ctrlKey || event.metaKey) && (event.key === '?' || event.key === '/')) {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate quickly through the application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Navigation Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Badge variant="outline">Navigation</Badge>
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              {navigationShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.route}
                  keys={[modKey, shortcut.key.toUpperCase()]}
                  description={shortcut.description}
                />
              ))}
            </div>
          </div>

          {/* Tab Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Badge variant="outline">Tab Navigation</Badge>
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <ShortcutRow keys={[modKey, '1-9']} description="Switch to tab 1-9" />
              <ShortcutRow keys={['Alt', '→']} description="Next tab" />
              <ShortcutRow keys={['Alt', '←']} description="Previous tab" />
            </div>
          </div>

          {/* Trial Balance Specific */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Badge variant="outline">Trial Balance Tabs</Badge>
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <ShortcutRow keys={[modKey, '1']} description="Trial Balance" />
              <ShortcutRow keys={[modKey, '2']} description="Balance Sheet" />
              <ShortcutRow keys={[modKey, '3']} description="Profit & Loss" />
              <ShortcutRow keys={[modKey, '4']} description="Cash Flow" />
              <ShortcutRow keys={[modKey, '5']} description="Audit Report" />
            </div>
          </div>

          {/* Audit Tools Specific */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Badge variant="outline">Audit Tools Tabs</Badge>
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <ShortcutRow keys={[modKey, '1']} description="Tally Tools" />
              <ShortcutRow keys={[modKey, '2']} description="GST Related" />
              <ShortcutRow keys={[modKey, '3']} description="MCA Data" />
              <ShortcutRow keys={[modKey, '4']} description="Income Tax" />
              <ShortcutRow keys={[modKey, '5']} description="PDF Tools" />
              <ShortcutRow keys={[modKey, '6']} description="Analytics" />
            </div>
          </div>

          {/* General Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Badge variant="outline">General</Badge>
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <ShortcutRow keys={[modKey, '/']} description="Show keyboard shortcuts" />
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">{modKey} + /</kbd> anytime to view shortcuts
        </div>
      </DialogContent>
    </Dialog>
  );
}

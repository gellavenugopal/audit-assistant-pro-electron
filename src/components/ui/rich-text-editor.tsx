import { useEffect, useRef, useState } from 'react';
import { Bold, ChevronDown, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const TOOLBAR_ACTIONS = [
  { label: 'Bold', command: 'bold', Icon: Bold },
  { label: 'Italic', command: 'italic', Icon: Italic },
  { label: 'Underline', command: 'underline', Icon: Underline },
];

const looksLikeHtml = (value: string) => /<[a-z][\s\S]*>/i.test(value);

const hslToHex = (h: number, s: number, l: number) => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const THEME_COLORS = [
  '#000000',
  '#1F4E79',
  '#2E75B6',
  '#5B9BD5',
  '#70AD47',
  '#FFC000',
  '#ED7D31',
  '#A5A5A5',
  '#7F7F7F',
  '#7030A0',
];

const STANDARD_COLORS = [
  '#000000',
  '#FFFFFF',
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
];

const EXTENDED_COLORS = (() => {
  const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const lightness = [30, 45, 60, 75];
  const colors: string[] = [];
  hues.forEach((h) => {
    lightness.forEach((l) => {
      colors.push(hslToHex(h, 80, l));
    });
  });
  return colors;
})();

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showMoreColors, setShowMoreColors] = useState(false);

  const updateEmptyState = () => {
    const text = editorRef.current?.textContent ?? '';
    setIsEmpty(text.trim().length === 0);
  };

  const emitChange = () => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(html);
    updateEmptyState();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    selectionRef.current = selection.getRangeAt(0);
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const applyCommand = (command: string, valueArg?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    if (command === 'foreColor') {
      document.execCommand('styleWithCSS', false, 'true');
    }
    document.execCommand(command, false, valueArg);
    emitChange();
  };

  const applyColor = (color: string) => {
    setCurrentColor(color);
    applyCommand('foreColor', color);
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const html = value || '';
    if (looksLikeHtml(html)) {
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    } else if (editorRef.current.textContent !== html) {
      editorRef.current.textContent = html;
    }
    updateEmptyState();
  }, [value]);

  return (
    <div className={cn('rounded-md border bg-background', disabled && 'opacity-70', className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1">
        {TOOLBAR_ACTIONS.map(({ label, command, Icon }) => (
          <Button
            key={command}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              applyCommand(command);
            }}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        <Popover onOpenChange={() => setShowMoreColors(false)}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-2"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
            >
              <span
                className="h-3 w-3 rounded-sm border"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-xs">Text Color</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Theme Colors</p>
                <div className="mt-1 grid grid-cols-10 gap-1">
                  {THEME_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-4 w-4 rounded-sm border',
                        currentColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyColor(color);
                      }}
                      aria-label={`Use color ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Standard Colors</p>
                <div className="mt-1 grid grid-cols-10 gap-1">
                  {STANDARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-4 w-4 rounded-sm border',
                        currentColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyColor(color);
                      }}
                      aria-label={`Use color ${color}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start px-2 text-xs"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowMoreColors((prev) => !prev)}
              >
                {showMoreColors ? 'Hide colors' : 'More colors...'}
              </Button>
              {showMoreColors && (
                <div className="rounded-md border bg-muted/30 p-2">
                  <p className="text-xs font-semibold text-muted-foreground">More Colors</p>
                  <div className="mt-2 grid grid-cols-12 gap-1">
                    {EXTENDED_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'h-4 w-4 rounded-sm border',
                          currentColor.toLowerCase() === color.toLowerCase() && 'ring-2 ring-primary'
                        )}
                        style={{ backgroundColor: color }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applyColor(color);
                        }}
                        aria-label={`Use color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative">
        {placeholder && isEmpty && !isFocused && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          className="min-h-[96px] px-3 py-2 text-sm outline-none whitespace-pre-wrap break-words"
          onInput={emitChange}
          onBlur={() => {
            setIsFocused(false);
            saveSelection();
            emitChange();
          }}
          onFocus={() => setIsFocused(true)}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
        />
      </div>
    </div>
  );
}

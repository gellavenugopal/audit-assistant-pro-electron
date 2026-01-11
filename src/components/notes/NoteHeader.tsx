import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NoteHeaderProps {
  noteNumber: string;
  title: ReactNode;
  scaleLabel?: string;
  className?: string;
}

export function NoteHeader({ noteNumber, title, scaleLabel, className }: NoteHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
          Note {noteNumber}
        </span>
        <div className="text-base font-semibold leading-tight">{title}</div>
      </div>
      {scaleLabel ? (
        <p className="text-xs text-muted-foreground">{scaleLabel}</p>
      ) : null}
    </div>
  );
}

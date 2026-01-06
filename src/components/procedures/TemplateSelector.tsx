import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, Search, FileText } from 'lucide-react';
import { ProcedureTemplate } from '@/hooks/useProcedureTemplates';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  templates: ProcedureTemplate[];
  selectedTemplateId?: string;
  onSelect: (template: ProcedureTemplate | null) => void;
  disabled?: boolean;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  disabled,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    if (!search) return templates;
    const lower = search.toLowerCase();
    return templates.filter(
      t => 
        t.procedure_name.toLowerCase().includes(lower) ||
        t.area.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower)
    );
  }, [templates, search]);

  // Group by area
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ProcedureTemplate[]> = {};
    filteredTemplates.forEach(t => {
      if (!groups[t.area]) groups[t.area] = [];
      groups[t.area].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTemplates]);

  return (
    <div className="space-y-2">
      <Label>Choose from Template (optional)</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {selectedTemplate ? (
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedTemplate.procedure_name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {selectedTemplate.area}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Select a template to auto-fill...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-[300px]">
            {templates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No templates available. Create templates in Admin Settings → Programs.
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No templates match your search.
              </div>
            ) : (
              <div className="p-1">
                {/* Clear selection option */}
                {selectedTemplate && (
                  <button
                    onClick={() => {
                      onSelect(null);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors",
                      "text-muted-foreground italic"
                    )}
                  >
                    Clear selection
                  </button>
                )}
                
                {groupedTemplates.map(([area, areaTemplates]) => (
                  <div key={area} className="mb-2">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {area}
                    </div>
                    {areaTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => {
                          onSelect(template);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded hover:bg-muted transition-colors",
                          "flex items-start gap-2",
                          selectedTemplateId === template.id && "bg-muted"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {template.procedure_name}
                            </span>
                            {selectedTemplateId === template.id && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {template.description}
                            </p>
                          )}
                          {template.assertion && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {template.assertion}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, Search, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface MultiAssigneeSelectProps {
  members: TeamMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  maxDisplay?: number;
}

export function MultiAssigneeSelect({
  members,
  selectedIds,
  onChange,
  disabled,
  maxDisplay = 2,
}: MultiAssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedMembers = useMemo(
    () => members.filter(m => selectedIds.includes(m.user_id)),
    [members, selectedIds]
  );

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const lower = search.toLowerCase();
    return members.filter(
      m => 
        m.full_name.toLowerCase().includes(lower) ||
        m.email.toLowerCase().includes(lower)
    );
  }, [members, search]);

  const toggleMember = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const removeMember = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== userId));
  };

  return (
    <div className="space-y-2">
      <Label>Assigned To</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal min-h-[40px] h-auto py-2"
            disabled={disabled}
          >
            {selectedMembers.length === 0 ? (
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select team members...
              </span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedMembers.slice(0, maxDisplay).map(member => (
                  <Badge 
                    key={member.user_id} 
                    variant="secondary" 
                    className="text-xs gap-1 pr-1"
                  >
                    {member.full_name}
                    <button
                      type="button"
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                      onClick={(e) => removeMember(member.user_id, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedMembers.length > maxDisplay && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedMembers.length - maxDisplay} more
                  </Badge>
                )}
              </div>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No team members found.
              </div>
            ) : (
              <div className="p-1">
                {filteredMembers.map(member => {
                  const isSelected = selectedIds.includes(member.user_id);
                  return (
                    <button
                      key={member.user_id}
                      onClick={() => toggleMember(member.user_id)}
                      className={cn(
                        "w-full text-left px-2 py-2 rounded hover:bg-muted transition-colors",
                        "flex items-center gap-2",
                        isSelected && "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 border rounded flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary border-primary" : "border-input"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      {member.role && (
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {member.role}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {selectedIds.length > 0 && (
            <div className="p-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => onChange([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

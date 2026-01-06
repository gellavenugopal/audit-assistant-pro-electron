import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Client } from '@/hooks/useClients';

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onSelect: (clientName: string) => void;
  onCreateNew: () => void;
  disabled?: boolean;
}

export function ClientCombobox({
  clients,
  value,
  onSelect,
  onCreateNew,
  disabled = false,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);

  // Get unique industries
  const industries = useMemo(() => {
    const industrySet = new Set<string>();
    clients.forEach((client) => {
      if (client.industry) {
        industrySet.add(client.industry);
      }
    });
    return Array.from(industrySet).sort();
  }, [clients]);

  // Filter clients by search and industry
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchesIndustry = !industryFilter || client.industry === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [clients, searchValue, industryFilter]);

  // Group clients by industry
  const groupedClients = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    filteredClients.forEach((client) => {
      const industry = client.industry || 'Other';
      if (!groups[industry]) {
        groups[industry] = [];
      }
      groups[industry].push(client);
    });
    return groups;
  }, [filteredClients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || 'Select client...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput
            placeholder="Search clients..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          
          {/* Industry filter badges */}
          {industries.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2 border-b">
              <Badge
                variant={industryFilter === null ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setIndustryFilter(null)}
              >
                All
              </Badge>
              {industries.map((industry) => (
                <Badge
                  key={industry}
                  variant={industryFilter === industry ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setIndustryFilter(industryFilter === industry ? null : industry)}
                >
                  {industry}
                </Badge>
              ))}
            </div>
          )}

          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center text-sm text-muted-foreground">
                No client found.
              </div>
            </CommandEmpty>
            
            {Object.entries(groupedClients).map(([industry, industryClients]) => (
              <CommandGroup key={industry} heading={industry}>
                {industryClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => {
                      onSelect(client.name);
                      setOpen(false);
                      setSearchValue('');
                      setIndustryFilter(null);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === client.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {client.name}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onCreateNew();
                  setOpen(false);
                  setSearchValue('');
                  setIndustryFilter(null);
                }}
                className="text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add new client
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

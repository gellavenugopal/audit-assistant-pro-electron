import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

type InlineComboboxProps = {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  inputStyle?: React.CSSProperties;
};

export function InlineCombobox({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
  className,
  inputStyle,
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open, value]);

  const filteredOptions = useMemo(() => {
    const needle = search.toLowerCase().trim();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) {
          setOpen(false);
          return;
        }
        setOpen(next);
        if (next) {
          setSearch('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            setSearch(nextValue);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={(event) => event.stopPropagation()}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} truncate whitespace-nowrap overflow-hidden`}
          style={inputStyle}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[9999]" align="start" sideOffset={4}>
        <Command>
          <CommandList className="max-h-56 overflow-auto" onWheel={(event) => event.stopPropagation()}>
            {filteredOptions.length === 0 && <CommandEmpty>No matches found.</CommandEmpty>}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

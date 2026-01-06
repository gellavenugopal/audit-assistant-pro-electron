import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FSFormatType, 
  CONSTITUTION_TO_FORMAT, 
  getFormatLabel,
  downloadFormatTemplate 
} from '@/data/financialStatementFormats';

interface FormatSelectorProps {
  constitution: string;
  onConstitutionChange?: (value: string) => void;
  showDownload?: boolean;
  disabled?: boolean;
}

export function FormatSelector({ 
  constitution, 
  onConstitutionChange, 
  showDownload = true,
  disabled = false 
}: FormatSelectorProps) {
  const formatType = CONSTITUTION_TO_FORMAT[constitution] || 'corporate';
  const formatLabel = getFormatLabel(constitution);

  const handleDownloadBS = () => {
    downloadFormatTemplate('balance_sheet', constitution);
  };

  const handleDownloadPL = () => {
    downloadFormatTemplate('profit_loss', constitution);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Format:</span>
        {onConstitutionChange ? (
          <Select 
            value={constitution} 
            onValueChange={onConstitutionChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Corporate (Schedule III)</SelectItem>
              <SelectItem value="llp">LLP (ICAI)</SelectItem>
              <SelectItem value="partnership">Non-Corporate (ICAI)</SelectItem>
              <SelectItem value="proprietorship">Proprietorship (ICAI)</SelectItem>
              <SelectItem value="trust">Trust (ICAI)</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm font-medium px-2 py-1 bg-muted rounded">
            {formatLabel}
          </span>
        )}
      </div>
      
      {showDownload && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Download Format
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadBS}>
              <Download className="h-4 w-4 mr-2" />
              Balance Sheet Format
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPL}>
              <Download className="h-4 w-4 mr-2" />
              Profit & Loss Format
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

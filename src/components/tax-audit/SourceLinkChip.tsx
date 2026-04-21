import { useNavigate } from 'react-router-dom';
import type { ElementType } from 'react';
import { Building2, FileSpreadsheet, Paperclip, Receipt, Settings, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TaxAuditSourceLink } from '@/types/taxAudit';

const ICONS: Record<TaxAuditSourceLink['module'], ElementType> = {
  client_master: Building2,
  engagement: Building2,
  financial_review: FileSpreadsheet,
  gst: Receipt,
  tax_audit_setup: Settings,
  compliance_applicability: ShieldCheck,
  evidence: Paperclip,
  manual: Settings,
};

export function SourceLinkChip({ link }: { link: TaxAuditSourceLink }) {
  const navigate = useNavigate();
  const Icon = ICONS[link.module] || Settings;
  const clickable = Boolean(link.route);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        if (link.route) navigate(link.route);
      }}
      title={link.displayValue ? `${link.label}: ${link.displayValue}` : link.label}
      className="inline-flex"
    >
      <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px]">
        <Icon className="h-3 w-3" />
        {link.label}
      </Badge>
    </button>
  );
}

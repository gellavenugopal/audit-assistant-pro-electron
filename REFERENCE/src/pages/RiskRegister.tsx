import { useState } from 'react';
import { useRisks, Risk } from '@/hooks/useRisks';
import { useEngagements } from '@/hooks/useEngagements';
import { StatusBadge, getRiskVariant, getStatusVariant } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, AlertTriangle, Filter, Loader2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkImportDialog } from '@/components/BulkImportDialog';

export default function RiskRegister() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [creating, setCreating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [riskArea, setRiskArea] = useState('');
  const [description, setDescription] = useState('');
  const [riskType, setRiskType] = useState('significant');
  const [inherentRisk, setInherentRisk] = useState('medium');
  const [controlRisk, setControlRisk] = useState('medium');
  const [auditResponse, setAuditResponse] = useState('');
  const [selectedEngagement, setSelectedEngagement] = useState('');

  const { risks, loading, createRisk } = useRisks();
  const { engagements } = useEngagements();

  const riskImportFields = [
    { key: 'risk_area', label: 'Risk Area', required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'risk_type', label: 'Risk Type' },
    { key: 'inherent_risk', label: 'Inherent Risk' },
    { key: 'control_risk', label: 'Control Risk' },
    { key: 'key_controls', label: 'Key Controls' },
    { key: 'audit_response', label: 'Audit Response' },
  ];

  const handleBulkImport = async (data: Record<string, string>[]) => {
    const defaultEngagementId = engagements[0]?.id;
    if (!defaultEngagementId) {
      throw new Error('Please create an engagement first');
    }

    const riskMatrix: Record<string, Record<string, string>> = {
      high: { high: 'high', medium: 'high', low: 'medium' },
      medium: { high: 'high', medium: 'medium', low: 'low' },
      low: { high: 'medium', medium: 'low', low: 'low' },
    };

    for (const row of data) {
      const ir = row.inherent_risk?.toLowerCase() || 'medium';
      const cr = row.control_risk?.toLowerCase() || 'medium';
      const combined = riskMatrix[ir]?.[cr] || 'medium';

      await createRisk({
        engagement_id: defaultEngagementId,
        risk_area: row.risk_area,
        description: row.description,
        risk_type: row.risk_type || 'significant',
        inherent_risk: ir,
        control_risk: cr,
        combined_risk: combined,
        key_controls: row.key_controls || null,
        audit_response: row.audit_response || null,
        status: 'open',
      });
    }
  };

  const filteredRisks = risks.filter(
    (risk) =>
      risk.risk_area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const riskCounts = {
    high: risks.filter((r) => r.combined_risk === 'high').length,
    medium: risks.filter((r) => r.combined_risk === 'medium').length,
    low: risks.filter((r) => r.combined_risk === 'low').length,
  };

  const handleCreate = async () => {
    if (!riskArea || !description || !selectedEngagement) return;

    setCreating(true);
    try {
      // Calculate combined risk
      const riskMatrix: Record<string, Record<string, string>> = {
        high: { high: 'high', medium: 'high', low: 'medium' },
        medium: { high: 'high', medium: 'medium', low: 'low' },
        low: { high: 'medium', medium: 'low', low: 'low' },
      };
      const combinedRisk = riskMatrix[inherentRisk][controlRisk];

      await createRisk({
        engagement_id: selectedEngagement,
        risk_area: riskArea,
        description,
        risk_type: riskType,
        inherent_risk: inherentRisk,
        control_risk: controlRisk,
        combined_risk: combinedRisk,
        key_controls: null,
        audit_response: auditResponse || null,
        status: 'open',
      });

      // Reset form
      setRiskArea('');
      setDescription('');
      setRiskType('significant');
      setInherentRisk('medium');
      setControlRisk('medium');
      setAuditResponse('');
      setSelectedEngagement('');
      setIsDialogOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Risk Register</h1>
          <p className="text-muted-foreground mt-1">
            Identify,assess audit risks and plan responses thereof
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Risk
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Risk</DialogTitle>
              <DialogDescription>
                Identify a new risk and link it to an engagement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Engagement</Label>
                <Select value={selectedEngagement} onValueChange={setSelectedEngagement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.client_name} - {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Area</Label>
                <Select value={riskArea} onValueChange={setRiskArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Inventory">Inventory</SelectItem>
                    <SelectItem value="Receivables">Receivables</SelectItem>
                    <SelectItem value="Fixed Assets">Fixed Assets</SelectItem>
                    <SelectItem value="Payables">Payables</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Describe the risk and its potential impact..." 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Risk Type</Label>
                  <Select value={riskType} onValueChange={setRiskType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="significant">Significant Risk</SelectItem>
                      <SelectItem value="fraud">Fraud Risk</SelectItem>
                      <SelectItem value="normal">Normal Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inherent Risk</Label>
                  <Select value={inherentRisk} onValueChange={setInherentRisk}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Control Risk</Label>
                  <Select value={controlRisk} onValueChange={setControlRisk}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Planned Response</Label>
                <Textarea 
                  placeholder="Describe the planned audit response..." 
                  rows={2}
                  value={auditResponse}
                  onChange={(e) => setAuditResponse(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!riskArea || !description || !selectedEngagement || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Risk'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? <Skeleton className="h-8 w-8" /> : riskCounts.high}
            </p>
            <p className="text-sm text-muted-foreground">High Risk</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/10">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? <Skeleton className="h-8 w-8" /> : riskCounts.medium}
            </p>
            <p className="text-sm text-muted-foreground">Medium Risk</p>
          </div>
        </div>
        <div className="audit-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/10">
            <AlertTriangle className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {loading ? <Skeleton className="h-8 w-8" /> : riskCounts.low}
            </p>
            <p className="text-sm text-muted-foreground">Low Risk</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Risk Table */}
      <div className="audit-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead className="w-24">Area</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-24 text-center">IR</TableHead>
                <TableHead className="w-24 text-center">CR</TableHead>
                <TableHead className="w-24 text-center">Combined</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8" />
                      <p>No risks identified yet</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Add your first risk
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRisks.map((risk) => (
                  <TableRow
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedRisk(risk)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{risk.risk_area}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {risk.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{risk.risk_area}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{risk.risk_type}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge variant={getRiskVariant(risk.inherent_risk)} dot={false}>
                        {risk.inherent_risk.charAt(0).toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge variant={getRiskVariant(risk.control_risk)} dot={false}>
                        {risk.control_risk.charAt(0).toUpperCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge variant={getRiskVariant(risk.combined_risk)}>
                        {risk.combined_risk}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={getStatusVariant(risk.status)}>
                        {risk.status}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Risk Detail Dialog */}
      <Dialog open={!!selectedRisk} onOpenChange={() => setSelectedRisk(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRisk?.risk_area}</DialogTitle>
            <DialogDescription>{selectedRisk?.risk_type}</DialogDescription>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm text-foreground mt-1">{selectedRisk.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Inherent Risk</Label>
                  <div className="mt-1">
                    <StatusBadge variant={getRiskVariant(selectedRisk.inherent_risk)}>
                      {selectedRisk.inherent_risk}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Control Risk</Label>
                  <div className="mt-1">
                    <StatusBadge variant={getRiskVariant(selectedRisk.control_risk)}>
                      {selectedRisk.control_risk}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Combined Risk</Label>
                  <div className="mt-1">
                    <StatusBadge variant={getRiskVariant(selectedRisk.combined_risk)}>
                      {selectedRisk.combined_risk}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              {selectedRisk.audit_response && (
                <div>
                  <Label className="text-muted-foreground">Planned Response</Label>
                  <p className="text-sm text-foreground mt-1">{selectedRisk.audit_response}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Risks"
        description="Upload an Excel or CSV file with risk data. Download the template for the correct format."
        fields={riskImportFields}
        onImport={handleBulkImport}
        templateData={[
          { risk_area: 'Revenue', description: 'Risk of revenue overstatement', risk_type: 'significant', inherent_risk: 'high', control_risk: 'medium', key_controls: 'Automated controls', audit_response: 'Substantive testing' },
          { risk_area: 'Inventory', description: 'Risk of obsolete inventory', risk_type: 'normal', inherent_risk: 'medium', control_risk: 'low', key_controls: 'Stock counts', audit_response: 'Test NRV' },
        ]}
      />
    </div>
  );
}

import { useState } from 'react';
import { sampleMateriality } from '@/data/sampleData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Calculator, CheckCircle, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Materiality() {
  const [benchmark, setBenchmark] = useState(sampleMateriality.benchmark);
  const [benchmarkAmount, setBenchmarkAmount] = useState(sampleMateriality.benchmarkAmount);
  const [percentage, setPercentage] = useState(sampleMateriality.percentage);

  const calculateMateriality = () => {
    const om = benchmarkAmount * (percentage / 100);
    const pm = om * 0.75;
    const trivial = om * 0.05;
    return { om, pm, trivial };
  };

  const { om, pm, trivial } = calculateMateriality();

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materiality</h1>
          <p className="text-muted-foreground mt-1">
            Version {sampleMateriality.version} • Calculate and document materiality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            Version History
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Card */}
          <div className="audit-card">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Materiality Calculator</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Benchmark</Label>
                  <Select value={benchmark} onValueChange={setBenchmark}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Profit Before Tax">Profit Before Tax</SelectItem>
                      <SelectItem value="Total Revenue">Total Revenue</SelectItem>
                      <SelectItem value="Total Assets">Total Assets</SelectItem>
                      <SelectItem value="Total Equity">Total Equity</SelectItem>
                      <SelectItem value="Gross Profit">Gross Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Benchmark Amount (₹)</Label>
                  <Input
                    type="number"
                    value={benchmarkAmount}
                    onChange={(e) => setBenchmarkAmount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(benchmarkAmount)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 1-5% for PBT, 0.5-1% for Revenue
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>PM Factor</Label>
                  <Input value="75%" disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Performance Materiality = 75% of OM
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Trivial Threshold Factor</Label>
                  <Input value="5%" disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Clearly Trivial = 5% of OM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rationale Card */}
          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Materiality Rationale</h2>
            <Textarea
              rows={4}
              defaultValue={sampleMateriality.rationale}
              placeholder="Document the rationale for the selected benchmark and percentage..."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Explain why the chosen benchmark is appropriate for this entity and stakeholders.
            </p>
          </div>

          {/* Approval Section */}
          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Approval</h2>
            {sampleMateriality.approvedBy ? (
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Approved by {sampleMateriality.approvedBy}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sampleMateriality.approvedAt && 
                      format(new Date(sampleMateriality.approvedAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg border border-warning/20">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Pending Approval</p>
                  <p className="text-xs text-muted-foreground">
                    Materiality must be approved by Manager/Partner
                  </p>
                </div>
                <Button size="sm">Request Approval</Button>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="audit-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Overall Materiality (OM)
            </p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(om)}</p>
          </div>

          <div className="audit-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Performance Materiality (PM)
            </p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(pm)}</p>
            <p className="text-xs text-muted-foreground mt-1">75% of OM</p>
          </div>

          <div className="audit-card text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Clearly Trivial Threshold
            </p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(trivial)}</p>
            <p className="text-xs text-muted-foreground mt-1">5% of OM</p>
          </div>

          <div className="audit-card">
            <h3 className="font-medium text-foreground mb-3">Quick Reference</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Benchmark</span>
                <span className="text-foreground">{benchmark}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground">{formatCurrency(benchmarkAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Percentage</span>
                <span className="text-foreground">{percentage}%</span>
              </div>
            </div>
          </div>

          <Button className="w-full">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

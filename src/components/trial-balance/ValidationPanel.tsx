import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MappingResult } from '@/services/scheduleIIIRuleEngine';
import { TrialBalanceLine } from '@/hooks/useTrialBalance';

interface ValidationRule {
  id: string;
  ruleId: string;
  validationType: string;
  conditionDescription: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  messageTemplate: string;
  isActive: boolean;
}

interface ValidationPanelProps {
  lines: TrialBalanceLine[];
  mappingResults: Map<string, MappingResult>;
  validationRules: ValidationRule[];
  formatCurrency: (amount: number) => string;
}

interface ValidationIssue {
  lineId: string;
  line: TrialBalanceLine;
  ruleId: string;
  rule: ValidationRule;
  message: string;
}

export function ValidationPanel({ lines, mappingResults, validationRules, formatCurrency }: ValidationPanelProps) {
  // Collect all validation issues
  const issues = useMemo(() => {
    const allIssues: ValidationIssue[] = [];
    
    lines.forEach(line => {
      const result = mappingResults.get(line.id);
      if (!result?.validationFlags) return;
      
      result.validationFlags.forEach(flagId => {
        const rule = validationRules.find(r => r.ruleId === flagId);
        if (!rule) return;
        
        const message = rule.messageTemplate
          .replace('{ledger_name}', line.account_name)
          .replace('{amount}', formatCurrency(Number(line.closing_balance)));
        
        allIssues.push({
          lineId: line.id,
          line,
          ruleId: flagId,
          rule,
          message
        });
      });
    });
    
    return allIssues;
  }, [lines, mappingResults, validationRules, formatCurrency]);

  // Group by severity
  const issuesBySeverity = useMemo(() => ({
    Critical: issues.filter(i => i.rule.severity === 'Critical'),
    High: issues.filter(i => i.rule.severity === 'High'),
    Medium: issues.filter(i => i.rule.severity === 'Medium'),
    Low: issues.filter(i => i.rule.severity === 'Low'),
  }), [issues]);

  // Group by rule type
  const issuesByType = useMemo(() => {
    const grouped: Record<string, ValidationIssue[]> = {};
    issues.forEach(issue => {
      if (!grouped[issue.rule.validationType]) {
        grouped[issue.rule.validationType] = [];
      }
      grouped[issue.rule.validationType].push(issue);
    });
    return grouped;
  }, [issues]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'High': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'Medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'Low': return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical': return <Badge variant="destructive">Critical</Badge>;
      case 'High': return <Badge className="bg-orange-500">High</Badge>;
      case 'Medium': return <Badge className="bg-yellow-500 text-black">Medium</Badge>;
      case 'Low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
          <h3 className="text-lg font-medium">No Validation Issues</h3>
          <p className="text-muted-foreground mt-1">
            All ledgers passed validation checks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground uppercase">Critical</p>
            </div>
            <p className="text-2xl font-bold text-destructive">{issuesBySeverity.Critical.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-muted-foreground uppercase">High</p>
            </div>
            <p className="text-2xl font-bold text-orange-500">{issuesBySeverity.High.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Info className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-muted-foreground uppercase">Medium</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{issuesBySeverity.Medium.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase">Low</p>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{issuesBySeverity.Low.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="critical" className="text-destructive">
            Critical ({issuesBySeverity.Critical.length})
          </TabsTrigger>
          <TabsTrigger value="high" className="text-orange-500">
            High ({issuesBySeverity.High.length})
          </TabsTrigger>
          <TabsTrigger value="bytype">By Type</TabsTrigger>
        </TabsList>

        {/* All Issues */}
        <TabsContent value="all">
          <Card className="p-0 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Severity</TableHead>
                    <TableHead className="w-20">Rule</TableHead>
                    <TableHead>Ledger</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue, idx) => (
                    <TableRow key={`${issue.lineId}-${issue.ruleId}-${idx}`}>
                      <TableCell>{getSeverityBadge(issue.rule.severity)}</TableCell>
                      <TableCell className="font-mono text-xs">{issue.ruleId}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{issue.line.account_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(issue.line.closing_balance))}</TableCell>
                      <TableCell className="text-sm max-w-[300px]">{issue.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{issue.rule.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Critical Issues */}
        <TabsContent value="critical">
          <Card className="p-0 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rule</TableHead>
                    <TableHead>Ledger</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuesBySeverity.Critical.map((issue, idx) => (
                    <TableRow key={`${issue.lineId}-${issue.ruleId}-${idx}`} className="bg-destructive/5">
                      <TableCell className="font-mono text-xs">{issue.ruleId}</TableCell>
                      <TableCell className="font-medium">{issue.line.account_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(issue.line.closing_balance))}</TableCell>
                      <TableCell className="text-sm">{issue.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{issue.rule.action}</TableCell>
                    </TableRow>
                  ))}
                  {issuesBySeverity.Critical.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No critical issues found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* High Issues */}
        <TabsContent value="high">
          <Card className="p-0 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Rule</TableHead>
                    <TableHead>Ledger</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuesBySeverity.High.map((issue, idx) => (
                    <TableRow key={`${issue.lineId}-${issue.ruleId}-${idx}`} className="bg-orange-500/5">
                      <TableCell className="font-mono text-xs">{issue.ruleId}</TableCell>
                      <TableCell className="font-medium">{issue.line.account_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(issue.line.closing_balance))}</TableCell>
                      <TableCell className="text-sm">{issue.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{issue.rule.action}</TableCell>
                    </TableRow>
                  ))}
                  {issuesBySeverity.High.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No high priority issues found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* By Type */}
        <TabsContent value="bytype" className="space-y-4">
          {Object.entries(issuesByType).map(([type, typeIssues]) => (
            <Card key={type}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  {type}
                  <Badge variant="outline">{typeIssues.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[200px]">
                  <Table>
                    <TableBody>
                      {typeIssues.slice(0, 10).map((issue, idx) => (
                        <TableRow key={`${issue.lineId}-${idx}`}>
                          <TableCell className="w-24">{getSeverityBadge(issue.rule.severity)}</TableCell>
                          <TableCell className="font-medium">{issue.line.account_name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(issue.line.closing_balance))}</TableCell>
                        </TableRow>
                      ))}
                      {typeIssues.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-2">
                            +{typeIssues.length - 10} more items
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Validation Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validation Rules Reference</CardTitle>
          <CardDescription>Active validation checks applied to trial balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {validationRules.filter(r => r.isActive).map(rule => (
              <div key={rule.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                {getSeverityIcon(rule.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{rule.ruleId}</span>
                    <span className="font-medium text-sm">{rule.validationType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.conditionDescription}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

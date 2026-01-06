import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Trash2, Pencil, RotateCcw, Copy, 
  Wand2, Settings2, FileText, PlayCircle, CheckCircle2, AlertTriangle,
  Target, Layers, BookOpen, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAileMappingRules } from '@/hooks/useAileMappingRules';
import { useScheduleIIIRules } from '@/hooks/useScheduleIIIRules';
import { useScheduleIIIConfig } from '@/hooks/useScheduleIIIConfig';
import { TrialBalanceLine, TrialBalanceLineInput } from '@/hooks/useTrialBalance';
import { useEngagement } from '@/contexts/EngagementContext';
import { 
  ScheduleIIIRuleEngine as RuleEngineService, 
  processTrialBalance, 
  calculateMappingStatistics,
  MappingResult 
} from '@/services/scheduleIIIRuleEngine';
import { getAllCodes, decodeScheduleIIICode } from '@/data/scheduleIIICodeStructure';
import { ScheduleIIIConfigPanel } from './ScheduleIIIConfigPanel';
import { ValidationPanel } from './ValidationPanel';

interface RuleEngineProps {
  lines: TrialBalanceLine[];
  onUpdateLines: (ids: string[], data: Partial<TrialBalanceLineInput>) => Promise<boolean>;
  reportingScale: string;
}

const MATCH_TYPE_OPTIONS = [
  { value: 'Contains', label: 'Contains' },
  { value: 'Starts With', label: 'Starts With' },
  { value: 'Ends With', label: 'Ends With' },
];

export function ScheduleIIIRuleEngine({ lines, onUpdateLines, reportingScale }: RuleEngineProps) {
  const { currentEngagement } = useEngagement();
  const engagementId = currentEngagement?.id || null;

  // Hooks
  const {
    ruleSets,
    activeRuleSetId,
    loading: legacyLoading,
    selectRuleSet,
    createDefaultRuleSet,
  } = useAileMappingRules();

  const {
    overrideRules,
    keywordRules,
    groupRules,
    validationRules,
    loading: rulesLoading,
    addOverrideRule,
    updateOverrideRule,
    deleteOverrideRule,
    addKeywordRule,
    updateKeywordRule,
    deleteKeywordRule,
    addGroupRule,
    updateGroupRule,
    deleteGroupRule,
    importDefaultRules,
    clearAllRules,
  } = useScheduleIIIRules(activeRuleSetId);

  const {
    config,
    loading: configLoading,
    getOrCreateConfig,
    updateConfig,
  } = useScheduleIIIConfig(engagementId);

  // State
  const [activeTab, setActiveTab] = useState('preview');
  const [activeRuleTab, setActiveRuleTab] = useState('override');
  const [applyingRules, setApplyingRules] = useState(false);
  
  // Dialog states
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [isKeywordDialogOpen, setIsKeywordDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<typeof overrideRules[0] | null>(null);
  const [editingKeyword, setEditingKeyword] = useState<typeof keywordRules[0] | null>(null);
  const [editingGroup, setEditingGroup] = useState<typeof groupRules[0] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'override' | 'keyword' | 'group'; id: string } | null>(null);

  // Form states
  const [overrideForm, setOverrideForm] = useState({
    ruleId: '',
    exactLedgerName: '',
    currentTallyGroup: '',
    overrideToCode: '',
    overrideToDescription: '',
    reasonForOverride: '',
    priority: 100,
    isActive: true,
  });

  const [keywordForm, setKeywordForm] = useState({
    ruleId: '',
    keywordPattern: '',
    matchType: 'Contains' as 'Contains' | 'Starts With' | 'Ends With',
    mapsToCode: '',
    mapsToDescription: '',
    priority: 50,
    isActive: true,
  });

  const [groupForm, setGroupForm] = useState({
    ruleId: '',
    tallyGroupName: '',
    tallyParentGroup: '',
    mapsToCode: '',
    mapsToDescription: '',
    notes: '',
    isActive: true,
  });

  const loading = legacyLoading || rulesLoading || configLoading;

  // Get all Schedule III codes for dropdown
  const allCodes = useMemo(() => getAllCodes(), []);

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    switch (reportingScale) {
      case 'rupees':
        return `${sign}₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
      case 'lakhs':
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'crores':
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'auto':
      default:
        if (absAmount >= 10000000) {
          return `${sign}₹${(absAmount / 10000000).toFixed(2)} Cr`;
        } else if (absAmount >= 100000) {
          return `${sign}₹${(absAmount / 100000).toFixed(2)} L`;
        }
        return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
    }
  };

  // Process lines through the rule engine
  const { mappingResults, stats } = useMemo(() => {
    if (!config || loading) {
      return { mappingResults: new Map<string, MappingResult>(), stats: null };
    }

    const engine = new RuleEngineService(
      { startNoteNumber: config.startNoteNumber, includeContingentLiabilities: config.includeContingentLiabilities },
      overrideRules.map(r => ({
        id: r.id,
        ruleId: r.ruleId,
        exactLedgerName: r.exactLedgerName,
        currentTallyGroup: r.currentTallyGroup,
        overrideToCode: r.overrideToCode,
        overrideToDescription: r.overrideToDescription,
        reasonForOverride: r.reasonForOverride,
        effectiveDate: r.effectiveDate,
        isActive: r.isActive,
        priority: r.priority,
      })),
      keywordRules.map(r => ({
        id: r.id,
        ruleId: r.ruleId,
        keywordPattern: r.keywordPattern,
        matchType: r.matchType,
        mapsToCode: r.mapsToCode,
        mapsToDescription: r.mapsToDescription,
        priority: r.priority,
        isActive: r.isActive,
      })),
      groupRules.map(r => ({
        id: r.id,
        ruleId: r.ruleId,
        tallyGroupName: r.tallyGroupName,
        tallyParentGroup: r.tallyParentGroup,
        mapsToCode: r.mapsToCode,
        mapsToDescription: r.mapsToDescription,
        notes: r.notes,
        isActive: r.isActive,
      })),
      validationRules.map(r => ({
        id: r.id,
        ruleId: r.ruleId,
        validationType: r.validationType,
        conditionDescription: r.conditionDescription,
        action: r.action,
        severity: r.severity,
        messageTemplate: r.messageTemplate,
        isActive: r.isActive,
      }))
    );

    const results = processTrialBalance(lines as any, engine);
    const statistics = calculateMappingStatistics(results, validationRules as any);

    return { mappingResults: results, stats: statistics };
  }, [lines, config, overrideRules, keywordRules, groupRules, validationRules, loading]);

  // Handle apply rules
  const handleApplyRules = async () => {
    setApplyingRules(true);
    try {
      // Group updates by code for efficient batch updates
      const updates: Record<string, { 
        ids: string[]; 
        code: string; 
        noteNumber: number | null;
        decoded: ReturnType<typeof decodeScheduleIIICode>;
      }> = {};
      
      mappingResults.forEach((result, lineId) => {
        if (result.code !== 'UNMAPPED') {
          const key = `${result.code}|${result.noteNumber || 'null'}`;
          if (!updates[key]) {
            const decoded = decodeScheduleIIICode(result.code);
            updates[key] = { 
              ids: [], 
              code: result.code, 
              noteNumber: result.noteNumber,
              decoded
            };
          }
          updates[key].ids.push(lineId);
        }
      });

      let successCount = 0;
      for (const update of Object.values(updates)) {
        // Map Schedule III code to all proper fields for BS/PL components
        const decoded = update.decoded;
        const success = await onUpdateLines(update.ids, { 
          aile: decoded.aile,
          fs_area: decoded.fs_area,
          face_group: decoded.face_group,
          note_group: decoded.note_group,
          sub_note: decoded.sub_note,
          note: update.noteNumber ? String(update.noteNumber) : null,
          // Also store the original Schedule III code in level4_group for reference
          level4_group: update.code,
        });
        if (success) successCount += update.ids.length;
      }

      toast.success(`Applied rules to ${successCount} ledgers. Data is now linked to Balance Sheet & P&L.`);
    } catch (error) {
      toast.error('Failed to apply rules');
    } finally {
      setApplyingRules(false);
    }
  };

  // Override rule handlers
  const handleSaveOverrideRule = async () => {
    if (!overrideForm.exactLedgerName.trim() || !overrideForm.overrideToCode) return;

    if (editingOverride) {
      await updateOverrideRule(editingOverride.id, overrideForm);
    } else {
      const nextRuleId = `OV${String(overrideRules.length + 1).padStart(3, '0')}`;
      await addOverrideRule({ ...overrideForm, ruleId: overrideForm.ruleId || nextRuleId, effectiveDate: null });
    }

    setIsOverrideDialogOpen(false);
    setEditingOverride(null);
    resetOverrideForm();
  };

  const resetOverrideForm = () => {
    setOverrideForm({
      ruleId: '',
      exactLedgerName: '',
      currentTallyGroup: '',
      overrideToCode: '',
      overrideToDescription: '',
      reasonForOverride: '',
      priority: 100,
      isActive: true,
    });
  };

  // Keyword rule handlers
  const handleSaveKeywordRule = async () => {
    if (!keywordForm.keywordPattern.trim() || !keywordForm.mapsToCode) return;

    if (editingKeyword) {
      await updateKeywordRule(editingKeyword.id, keywordForm);
    } else {
      const nextRuleId = `KW${String(keywordRules.length + 1).padStart(3, '0')}`;
      await addKeywordRule({ ...keywordForm, ruleId: keywordForm.ruleId || nextRuleId });
    }

    setIsKeywordDialogOpen(false);
    setEditingKeyword(null);
    resetKeywordForm();
  };

  const resetKeywordForm = () => {
    setKeywordForm({
      ruleId: '',
      keywordPattern: '',
      matchType: 'Contains',
      mapsToCode: '',
      mapsToDescription: '',
      priority: 50,
      isActive: true,
    });
  };

  // Group rule handlers
  const handleSaveGroupRule = async () => {
    if (!groupForm.tallyGroupName.trim() || !groupForm.mapsToCode) return;

    if (editingGroup) {
      await updateGroupRule(editingGroup.id, groupForm);
    } else {
      const nextRuleId = `GM${String(groupRules.length + 1).padStart(3, '0')}`;
      await addGroupRule({ ...groupForm, ruleId: groupForm.ruleId || nextRuleId });
    }

    setIsGroupDialogOpen(false);
    setEditingGroup(null);
    resetGroupForm();
  };

  const resetGroupForm = () => {
    setGroupForm({
      ruleId: '',
      tallyGroupName: '',
      tallyParentGroup: '',
      mapsToCode: '',
      mapsToDescription: '',
      notes: '',
      isActive: true,
    });
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    switch (deleteConfirm.type) {
      case 'override':
        await deleteOverrideRule(deleteConfirm.id);
        break;
      case 'keyword':
        await deleteKeywordRule(deleteConfirm.id);
        break;
      case 'group':
        await deleteGroupRule(deleteConfirm.id);
        break;
    }
    setDeleteConfirm(null);
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'override': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'keyword': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'group': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Show prompt to create default rules if no rule sets exist
  if (ruleSets.length === 0) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <Wand2 className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>No Rule Sets Found</CardTitle>
          <CardDescription>
            Create a Schedule III rule set to automatically map Tally ledgers to Indian Financial Statement format.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => createDefaultRuleSet()} className="gap-2">
            <Wand2 className="h-4 w-4" />
            Create Schedule III Rules
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ensure config exists
  if (!config && engagementId) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <Settings2 className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Configure Note Numbering</CardTitle>
          <CardDescription>
            Set up the starting note number and contingent liabilities option for this engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={() => getOrCreateConfig()} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Configuration
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={activeRuleSetId || ''} onValueChange={selectRuleSet}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select rule set" />
            </SelectTrigger>
            <SelectContent>
              {ruleSets.map(set => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name} {set.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setActiveTab('config')}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(overrideRules.length === 0 && keywordRules.length === 0 && groupRules.length === 0) && (
            <Button onClick={() => importDefaultRules()} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Import Default Rules
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => clearAllRules()} 
            className="gap-2"
            disabled={overrideRules.length === 0 && keywordRules.length === 0 && groupRules.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Override Rules</p>
            <p className="text-2xl font-bold text-purple-600">{overrideRules.filter(r => r.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Keyword Rules</p>
            <p className="text-2xl font-bold text-blue-600">{keywordRules.filter(r => r.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Group Rules</p>
            <p className="text-2xl font-bold text-green-600">{groupRules.filter(r => r.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Mapped</p>
            <p className="text-2xl font-bold text-success">{stats?.mapped || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">Unmapped</p>
            <p className="text-2xl font-bold text-destructive">{stats?.unmapped || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview" className="gap-2">
            <FileText className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Layers className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Preview mapping results. Priority: Override → Keyword → Group
            </p>
            <Button onClick={handleApplyRules} disabled={applyingRules || stats?.mapped === 0} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              {applyingRules ? 'Applying...' : 'Apply Rules'}
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger Name</TableHead>
                    <TableHead>Tally Group</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead>Schedule III Code</TableHead>
                    <TableHead className="text-center">Note</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => {
                    const result = mappingResults.get(line.id);
                    return (
                      <TableRow key={line.id} className={cn(
                        result?.ruleType === 'unmapped' && 'bg-destructive/5'
                      )}>
                        <TableCell className="font-medium max-w-[200px] truncate">{line.account_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.ledger_primary_group || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(Number(line.closing_balance))}</TableCell>
                        <TableCell>
                          {result?.code !== 'UNMAPPED' ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{result?.code}</code>
                          ) : (
                            <span className="text-destructive text-sm">Unmapped</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {result?.noteNumber ? (
                            <Badge variant="outline">{result.noteNumber}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {result?.ruleId ? (
                            <span className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                              getRuleTypeColor(result.ruleType)
                            )}>
                              {result.ruleId}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {result?.validationFlags && result.validationFlags.length > 0 ? (
                            <div className="flex gap-1">
                              {result.validationFlags.slice(0, 2).map(flag => (
                                <Badge key={flag} variant="outline" className="text-xs">
                                  {flag}
                                </Badge>
                              ))}
                              {result.validationFlags.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{result.validationFlags.length - 2}</Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Tabs value={activeRuleTab} onValueChange={setActiveRuleTab}>
            <TabsList>
              <TabsTrigger value="override" className="gap-2">
                <Target className="h-4 w-4" />
                Override ({overrideRules.length})
              </TabsTrigger>
              <TabsTrigger value="keyword" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Keyword ({keywordRules.length})
              </TabsTrigger>
              <TabsTrigger value="group" className="gap-2">
                <Layers className="h-4 w-4" />
                Group ({groupRules.length})
              </TabsTrigger>
            </TabsList>

            {/* Override Rules Tab */}
            <TabsContent value="override" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Priority 1: Exact ledger name matches. Highest priority.
                </p>
                <Button onClick={() => { resetOverrideForm(); setIsOverrideDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Override
                </Button>
              </div>

              <Card className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Rule ID</TableHead>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>Maps To Code</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overrideRules.map(rule => (
                        <TableRow key={rule.id} className={cn(!rule.isActive && 'opacity-50')}>
                          <TableCell className="font-mono text-xs">{rule.ruleId}</TableCell>
                          <TableCell className="font-medium">{rule.exactLedgerName}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 rounded">{rule.overrideToCode}</code></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{rule.reasonForOverride || '-'}</TableCell>
                          <TableCell>
                            {rule.isActive ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setEditingOverride(rule);
                                setOverrideForm({
                                  ruleId: rule.ruleId,
                                  exactLedgerName: rule.exactLedgerName,
                                  currentTallyGroup: rule.currentTallyGroup || '',
                                  overrideToCode: rule.overrideToCode,
                                  overrideToDescription: rule.overrideToDescription || '',
                                  reasonForOverride: rule.reasonForOverride || '',
                                  priority: rule.priority,
                                  isActive: rule.isActive,
                                });
                                setIsOverrideDialogOpen(true);
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'override', id: rule.id })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {overrideRules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No override rules defined. Override rules take highest priority.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Keyword Rules Tab */}
            <TabsContent value="keyword" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Priority 2: Pattern matching on ledger names.
                </p>
                <Button onClick={() => { resetKeywordForm(); setIsKeywordDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Keyword Rule
                </Button>
              </div>

              <Card className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Rule ID</TableHead>
                        <TableHead>Pattern</TableHead>
                        <TableHead>Match Type</TableHead>
                        <TableHead>Maps To Code</TableHead>
                        <TableHead className="w-20">Priority</TableHead>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keywordRules.map(rule => (
                        <TableRow key={rule.id} className={cn(!rule.isActive && 'opacity-50')}>
                          <TableCell className="font-mono text-xs">{rule.ruleId}</TableCell>
                          <TableCell className="font-mono">{rule.keywordPattern}</TableCell>
                          <TableCell className="text-sm">{rule.matchType}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 rounded">{rule.mapsToCode}</code></TableCell>
                          <TableCell className="font-mono">{rule.priority}</TableCell>
                          <TableCell>
                            {rule.isActive ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setEditingKeyword(rule);
                                setKeywordForm({
                                  ruleId: rule.ruleId,
                                  keywordPattern: rule.keywordPattern,
                                  matchType: rule.matchType,
                                  mapsToCode: rule.mapsToCode,
                                  mapsToDescription: rule.mapsToDescription || '',
                                  priority: rule.priority,
                                  isActive: rule.isActive,
                                });
                                setIsKeywordDialogOpen(true);
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'keyword', id: rule.id })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {keywordRules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No keyword rules defined.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Group Rules Tab */}
            <TabsContent value="group" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Priority 3: Tally group hierarchy mapping.
                </p>
                <Button onClick={() => { resetGroupForm(); setIsGroupDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Group Rule
                </Button>
              </div>

              <Card className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Rule ID</TableHead>
                        <TableHead>Tally Group</TableHead>
                        <TableHead>Parent Group</TableHead>
                        <TableHead>Maps To Code</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupRules.map(rule => (
                        <TableRow key={rule.id} className={cn(!rule.isActive && 'opacity-50')}>
                          <TableCell className="font-mono text-xs">{rule.ruleId}</TableCell>
                          <TableCell className="font-medium">{rule.tallyGroupName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{rule.tallyParentGroup || '-'}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-1 rounded">{rule.mapsToCode}</code></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{rule.notes || '-'}</TableCell>
                          <TableCell>
                            {rule.isActive ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setEditingGroup(rule);
                                setGroupForm({
                                  ruleId: rule.ruleId,
                                  tallyGroupName: rule.tallyGroupName,
                                  tallyParentGroup: rule.tallyParentGroup || '',
                                  mapsToCode: rule.mapsToCode,
                                  mapsToDescription: rule.mapsToDescription || '',
                                  notes: rule.notes || '',
                                  isActive: rule.isActive,
                                });
                                setIsGroupDialogOpen(true);
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'group', id: rule.id })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {groupRules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No group rules defined.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <ValidationPanel 
            lines={lines}
            mappingResults={mappingResults}
            validationRules={validationRules}
            formatCurrency={formatCurrency}
          />
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          {config && (
            <ScheduleIIIConfigPanel
              config={config}
              onUpdate={updateConfig}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Override Rule Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOverride ? 'Edit Override Rule' : 'Add Override Rule'}</DialogTitle>
            <DialogDescription>
              Override rules match exact ledger names and take highest priority.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Exact Ledger Name</Label>
              <Input 
                value={overrideForm.exactLedgerName} 
                onChange={e => setOverrideForm(p => ({ ...p, exactLedgerName: e.target.value }))}
                placeholder="e.g., Building - Leasehold"
              />
            </div>

            <div className="space-y-2">
              <Label>Current Tally Group (optional)</Label>
              <Input 
                value={overrideForm.currentTallyGroup} 
                onChange={e => setOverrideForm(p => ({ ...p, currentTallyGroup: e.target.value }))}
                placeholder="e.g., Fixed Assets"
              />
            </div>

            <div className="space-y-2">
              <Label>Maps To Code</Label>
              <Select value={overrideForm.overrideToCode} onValueChange={v => setOverrideForm(p => ({ ...p, overrideToCode: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Schedule III code" />
                </SelectTrigger>
                <SelectContent>
                  {allCodes.filter(c => c.level >= 3).map(code => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.code} - {code.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Override</Label>
              <Input 
                value={overrideForm.reasonForOverride} 
                onChange={e => setOverrideForm(p => ({ ...p, reasonForOverride: e.target.value }))}
                placeholder="e.g., Reclassify to correct category"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch 
                checked={overrideForm.isActive} 
                onCheckedChange={v => setOverrideForm(p => ({ ...p, isActive: v }))} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOverrideRule} disabled={!overrideForm.exactLedgerName.trim() || !overrideForm.overrideToCode}>
              {editingOverride ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyword Rule Dialog */}
      <Dialog open={isKeywordDialogOpen} onOpenChange={setIsKeywordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKeyword ? 'Edit Keyword Rule' : 'Add Keyword Rule'}</DialogTitle>
            <DialogDescription>
              Keyword rules match patterns in ledger names (Priority 2).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Keyword Pattern</Label>
                <Input 
                  value={keywordForm.keywordPattern} 
                  onChange={e => setKeywordForm(p => ({ ...p, keywordPattern: e.target.value }))}
                  placeholder="e.g., MSME, Director"
                />
              </div>
              <div className="space-y-2">
                <Label>Match Type</Label>
                <Select value={keywordForm.matchType} onValueChange={v => setKeywordForm(p => ({ ...p, matchType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maps To Code</Label>
              <Select value={keywordForm.mapsToCode} onValueChange={v => setKeywordForm(p => ({ ...p, mapsToCode: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Schedule III code" />
                </SelectTrigger>
                <SelectContent>
                  {allCodes.filter(c => c.level >= 3).map(code => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.code} - {code.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority (Higher = First)</Label>
                <Input 
                  type="number"
                  value={keywordForm.priority} 
                  onChange={e => setKeywordForm(p => ({ ...p, priority: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Active</Label>
                <Switch 
                  checked={keywordForm.isActive} 
                  onCheckedChange={v => setKeywordForm(p => ({ ...p, isActive: v }))} 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKeywordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKeywordRule} disabled={!keywordForm.keywordPattern.trim() || !keywordForm.mapsToCode}>
              {editingKeyword ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Rule Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group Rule' : 'Add Group Rule'}</DialogTitle>
            <DialogDescription>
              Group rules match Tally group hierarchy (Priority 3).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tally Group Name</Label>
                <Input 
                  value={groupForm.tallyGroupName} 
                  onChange={e => setGroupForm(p => ({ ...p, tallyGroupName: e.target.value }))}
                  placeholder="e.g., Sundry Debtors"
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Group (optional)</Label>
                <Input 
                  value={groupForm.tallyParentGroup} 
                  onChange={e => setGroupForm(p => ({ ...p, tallyParentGroup: e.target.value }))}
                  placeholder="e.g., Current Assets"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maps To Code</Label>
              <Select value={groupForm.mapsToCode} onValueChange={v => setGroupForm(p => ({ ...p, mapsToCode: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Schedule III code" />
                </SelectTrigger>
                <SelectContent>
                  {allCodes.filter(c => c.level >= 3).map(code => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.code} - {code.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input 
                value={groupForm.notes} 
                onChange={e => setGroupForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g., Check for MSME creditors"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch 
                checked={groupForm.isActive} 
                onCheckedChange={v => setGroupForm(p => ({ ...p, isActive: v }))} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGroupRule} disabled={!groupForm.tallyGroupName.trim() || !groupForm.mapsToCode}>
              {editingGroup ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteConfirm?.type} rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

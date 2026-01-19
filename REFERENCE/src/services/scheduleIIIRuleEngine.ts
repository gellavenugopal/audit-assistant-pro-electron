// Schedule III Rule Engine Service
// Implements 3-tier rule priority: Override → Keyword → Group

import { 
  BS_STRUCTURE, 
  PL_STRUCTURE, 
  buildNoteNumberMap, 
  getNoteNumberForCode,
  getCodeByCode 
} from '@/data/scheduleIIICodeStructure';

// ==========================================
// TYPES
// ==========================================

export interface ScheduleIIIConfig {
  startNoteNumber: number;
  includeContingentLiabilities: boolean;
}

export interface OverrideRule {
  id: string;
  ruleId: string;
  exactLedgerName: string;
  currentTallyGroup: string | null;
  overrideToCode: string;
  overrideToDescription: string | null;
  reasonForOverride: string | null;
  effectiveDate: string | null;
  isActive: boolean;
  priority: number;
}

export interface KeywordRule {
  id: string;
  ruleId: string;
  keywordPattern: string;
  matchType: 'Contains' | 'Starts With' | 'Ends With';
  mapsToCode: string;
  mapsToDescription: string | null;
  priority: number;
  isActive: boolean;
}

export interface GroupRule {
  id: string;
  ruleId: string;
  tallyGroupName: string;
  tallyParentGroup: string | null;
  mapsToCode: string;
  mapsToDescription: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface ValidationRule {
  id: string;
  ruleId: string;
  validationType: string;
  conditionDescription: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  messageTemplate: string;
  isActive: boolean;
}

export interface TrialBalanceLine {
  id: string;
  account_code: string;
  account_name: string;
  ledger_primary_group: string | null;
  ledger_parent: string | null;
  opening_balance: number;
  closing_balance: number;
  debit: number;
  credit: number;
}

export interface MappingResult {
  code: string;
  description: string | null;
  noteNumber: number | null;
  ruleId: string | null;
  ruleType: 'override' | 'keyword' | 'group' | 'unmapped';
  validationFlags: string[];
}

export interface ValidationResult {
  ruleId: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  message: string;
  action: string;
}

// ==========================================
// RULE ENGINE CLASS
// ==========================================

export class ScheduleIIIRuleEngine {
  private config: ScheduleIIIConfig;
  private overrideRules: OverrideRule[];
  private keywordRules: KeywordRule[];
  private groupRules: GroupRule[];
  private validationRules: ValidationRule[];
  private noteNumberMap: Map<string, number>;

  constructor(
    config: ScheduleIIIConfig,
    overrideRules: OverrideRule[] = [],
    keywordRules: KeywordRule[] = [],
    groupRules: GroupRule[] = [],
    validationRules: ValidationRule[] = []
  ) {
    this.config = config;
    this.overrideRules = overrideRules.filter(r => r.isActive);
    this.keywordRules = keywordRules.filter(r => r.isActive).sort((a, b) => b.priority - a.priority);
    this.groupRules = groupRules.filter(r => r.isActive);
    this.validationRules = validationRules.filter(r => r.isActive);
    this.noteNumberMap = buildNoteNumberMap(config.startNoteNumber, config.includeContingentLiabilities);
  }

  // ==========================================
  // MAIN MAPPING FUNCTION
  // ==========================================

  mapLedger(ledger: TrialBalanceLine): MappingResult {
    // Priority 1: Override Rules (exact ledger name match)
    const overrideResult = this.applyOverrideRules(ledger);
    if (overrideResult) {
      return this.createResult(overrideResult, ledger);
    }

    // Priority 2: Keyword Rules (pattern matching)
    const keywordResult = this.applyKeywordRules(ledger);
    if (keywordResult) {
      return this.createResult(keywordResult, ledger);
    }

    // Priority 3: Group Mapping Rules (Tally group hierarchy)
    const groupResult = this.applyGroupRules(ledger);
    if (groupResult) {
      return this.createResult(groupResult, ledger);
    }

    // No match - flag as unmapped
    return {
      code: 'UNMAPPED',
      description: null,
      noteNumber: null,
      ruleId: null,
      ruleType: 'unmapped',
      validationFlags: ['VL001']
    };
  }

  // ==========================================
  // RULE APPLICATION METHODS
  // ==========================================

  private applyOverrideRules(ledger: TrialBalanceLine): { code: string; description: string | null; ruleId: string; ruleType: 'override' } | null {
    const normalizedLedgerName = ledger.account_name.toLowerCase().trim();
    
    for (const rule of this.overrideRules.sort((a, b) => b.priority - a.priority)) {
      if (rule.exactLedgerName.toLowerCase().trim() === normalizedLedgerName) {
        // Check if tally group matches if specified
        if (rule.currentTallyGroup) {
          const ledgerGroup = (ledger.ledger_primary_group || ledger.ledger_parent || '').toLowerCase().trim();
          if (!ledgerGroup.includes(rule.currentTallyGroup.toLowerCase())) {
            continue;
          }
        }
        
        return {
          code: rule.overrideToCode,
          description: rule.overrideToDescription,
          ruleId: rule.ruleId,
          ruleType: 'override'
        };
      }
    }
    
    return null;
  }

  private applyKeywordRules(ledger: TrialBalanceLine): { code: string; description: string | null; ruleId: string; ruleType: 'keyword' } | null {
    const normalizedLedgerName = ledger.account_name.toUpperCase();
    
    for (const rule of this.keywordRules) {
      if (this.matchPattern(normalizedLedgerName, rule.keywordPattern.toUpperCase(), rule.matchType)) {
        return {
          code: rule.mapsToCode,
          description: rule.mapsToDescription,
          ruleId: rule.ruleId,
          ruleType: 'keyword'
        };
      }
    }
    
    return null;
  }

  private applyGroupRules(ledger: TrialBalanceLine): { code: string; description: string | null; ruleId: string; ruleType: 'group' } | null {
    const primaryGroup = (ledger.ledger_primary_group || '').toLowerCase().trim();
    const parentGroup = (ledger.ledger_parent || '').toLowerCase().trim();
    
    // First try exact match on primary group
    for (const rule of this.groupRules) {
      if (rule.tallyGroupName.toLowerCase().trim() === primaryGroup) {
        return {
          code: rule.mapsToCode,
          description: rule.mapsToDescription,
          ruleId: rule.ruleId,
          ruleType: 'group'
        };
      }
    }
    
    // Then try match on parent group
    for (const rule of this.groupRules) {
      if (rule.tallyGroupName.toLowerCase().trim() === parentGroup) {
        return {
          code: rule.mapsToCode,
          description: rule.mapsToDescription,
          ruleId: rule.ruleId,
          ruleType: 'group'
        };
      }
    }
    
    // Try partial match
    for (const rule of this.groupRules) {
      const ruleGroupLower = rule.tallyGroupName.toLowerCase().trim();
      if (primaryGroup.includes(ruleGroupLower) || ruleGroupLower.includes(primaryGroup)) {
        return {
          code: rule.mapsToCode,
          description: rule.mapsToDescription,
          ruleId: rule.ruleId,
          ruleType: 'group'
        };
      }
    }
    
    return null;
  }

  // ==========================================
  // PATTERN MATCHING
  // ==========================================

  private matchPattern(text: string, pattern: string, matchType: string): boolean {
    // Handle wildcards in pattern
    const regexPattern = pattern.replace(/\*/g, '.*');
    
    switch (matchType) {
      case 'Starts With':
        return new RegExp('^' + regexPattern, 'i').test(text);
      case 'Contains':
        return new RegExp(regexPattern, 'i').test(text);
      case 'Ends With':
        return new RegExp(regexPattern + '$', 'i').test(text);
      default:
        return new RegExp(regexPattern, 'i').test(text);
    }
  }

  // ==========================================
  // RESULT CREATION
  // ==========================================

  private createResult(
    match: { code: string; description: string | null; ruleId: string; ruleType: 'override' | 'keyword' | 'group' },
    ledger: TrialBalanceLine
  ): MappingResult {
    const noteNumber = getNoteNumberForCode(match.code, this.noteNumberMap);
    const codeInfo = getCodeByCode(match.code);
    const validationFlags = this.runValidations(ledger, match.code);
    
    return {
      code: match.code,
      description: match.description || codeInfo?.description || null,
      noteNumber,
      ruleId: match.ruleId,
      ruleType: match.ruleType,
      validationFlags
    };
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  runValidations(ledger: TrialBalanceLine, mappedCode: string): string[] {
    const flags: string[] = [];
    
    for (const rule of this.validationRules) {
      const shouldFlag = this.evaluateValidationRule(rule, ledger, mappedCode);
      if (shouldFlag) {
        flags.push(rule.ruleId);
      }
    }
    
    return flags;
  }

  private evaluateValidationRule(rule: ValidationRule, ledger: TrialBalanceLine, mappedCode: string): boolean {
    const closingBalance = ledger.closing_balance;
    const openingBalance = ledger.opening_balance;
    const accountName = ledger.account_name.toLowerCase();
    
    switch (rule.ruleId) {
      case 'VL001': // Unmapped
        return mappedCode === 'UNMAPPED';
        
      case 'VL002': // Debit balance in Liability account
        // Liability codes start with 'EL-' (Equity & Liabilities)
        // But exclude equity items (EL-SHF)
        if (mappedCode.startsWith('EL-') && !mappedCode.startsWith('EL-SHF')) {
          // Liabilities normally have credit (positive) balance
          // Debit balance would be negative
          return closingBalance < 0;
        }
        return false;
        
      case 'VL003': // Credit balance in Asset account
        // Asset codes start with 'AS-'
        if (mappedCode.startsWith('AS-')) {
          // Assets normally have debit (positive) balance
          // Credit balance would be negative
          return closingBalance < 0;
        }
        return false;
        
      case 'VL004': // Zero Balance
        return closingBalance === 0;
        
      case 'VL005': // Current/Non-Current classification needed
        const needsClassification = ['LTB', 'NCFI', 'LTL', 'NCI', 'LTLA'].some(s => mappedCode.includes(s));
        return needsClassification;
        
      case 'VL006': // Related Party
        const rpKeywords = ['director', 'promoter', 'relative', 'subsidiary', 'associate', 'holding', 'key management', 'kmp'];
        return rpKeywords.some(kw => accountName.includes(kw));
        
      case 'VL007': // MSME Creditor check
        // Only for trade payables not already classified as MSME
        if (mappedCode === 'EL-CL-TP-OTH') {
          // Flag for MSME verification
          return true;
        }
        return false;
        
      case 'VL008': // Statutory Dues
        const statutoryKeywords = ['gst', 'tds', 'tcs', 'pf payable', 'esi payable', 'pt payable', 'income tax'];
        return statutoryKeywords.some(kw => accountName.includes(kw));
        
      case 'VL009': // Large Balance (threshold: 10% of total assets or 1 crore, whichever is lower)
        // This would need total context - simplified check for now
        return Math.abs(closingBalance) > 10000000; // 1 crore
        
      case 'VL010': // Negative Balance (unexpected)
        // Already covered by VL002 and VL003 for specific cases
        // This catches other unusual negatives
        if (mappedCode.startsWith('INC-') && closingBalance < 0) {
          return true; // Income with debit balance
        }
        if (mappedCode.startsWith('EXP-') && closingBalance > 0) {
          return true; // Expense with credit balance
        }
        return false;
        
      case 'VL011': // Dormant Account
        // No movement = opening equals closing and no debits/credits
        return openingBalance === closingBalance && ledger.debit === 0 && ledger.credit === 0;
        
      default:
        return false;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  getValidationMessage(ruleId: string, ledger: TrialBalanceLine): string {
    const rule = this.validationRules.find(r => r.ruleId === ruleId);
    if (!rule) return `Validation ${ruleId} triggered`;
    
    return rule.messageTemplate
      .replace('{ledger_name}', ledger.account_name)
      .replace('{amount}', this.formatCurrency(ledger.closing_balance));
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  }

  getNoteNumberMap(): Map<string, number> {
    return this.noteNumberMap;
  }

  getConfig(): ScheduleIIIConfig {
    return this.config;
  }

  // Get summary of note number allocation
  getNoteAllocationSummary(): { bsNotes: string; clNote: string | null; plNotes: string } {
    const bsNotes = BS_STRUCTURE.filter(s => s.noteSequence !== null).length;
    const plNotes = PL_STRUCTURE.filter(s => s.noteSequence !== null).length;
    const start = this.config.startNoteNumber;
    
    const bsEnd = start + bsNotes - 1;
    let clNote: string | null = null;
    let plStart: number;
    
    if (this.config.includeContingentLiabilities) {
      clNote = String(bsEnd + 1);
      plStart = bsEnd + 2;
    } else {
      plStart = bsEnd + 1;
    }
    
    const plEnd = plStart + plNotes - 1;
    
    return {
      bsNotes: `${start} - ${bsEnd}`,
      clNote,
      plNotes: `${plStart} - ${plEnd}`
    };
  }
}

// ==========================================
// BATCH PROCESSING
// ==========================================

export function processTrialBalance(
  lines: TrialBalanceLine[],
  engine: ScheduleIIIRuleEngine
): Map<string, MappingResult> {
  const results = new Map<string, MappingResult>();
  
  for (const line of lines) {
    const result = engine.mapLedger(line);
    results.set(line.id, result);
  }
  
  return results;
}

// ==========================================
// STATISTICS
// ==========================================

export interface MappingStatistics {
  total: number;
  mapped: number;
  unmapped: number;
  byRuleType: {
    override: number;
    keyword: number;
    group: number;
  };
  validationFlags: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function calculateMappingStatistics(
  results: Map<string, MappingResult>,
  validationRules: ValidationRule[]
): MappingStatistics {
  const stats: MappingStatistics = {
    total: results.size,
    mapped: 0,
    unmapped: 0,
    byRuleType: { override: 0, keyword: 0, group: 0 },
    validationFlags: { critical: 0, high: 0, medium: 0, low: 0 }
  };
  
  const flagSeverityMap = new Map<string, 'Critical' | 'High' | 'Medium' | 'Low'>();
  validationRules.forEach(r => flagSeverityMap.set(r.ruleId, r.severity));
  
  results.forEach(result => {
    if (result.ruleType === 'unmapped') {
      stats.unmapped++;
    } else {
      stats.mapped++;
      stats.byRuleType[result.ruleType]++;
    }
    
    result.validationFlags.forEach(flag => {
      const severity = flagSeverityMap.get(flag);
      if (severity) {
        stats.validationFlags[severity.toLowerCase() as keyof typeof stats.validationFlags]++;
      }
    });
  });
  
  return stats;
}

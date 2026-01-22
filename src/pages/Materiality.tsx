import { useState, useEffect, useRef } from 'react';
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
import { Calculator, AlertCircle, Trash2, Plus, FileDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { RiskRegisterContent } from '@/pages/RiskRegister';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ICAI-CAQD SUGGESTED MATERIALITY GUIDANCE (ADVISORY)
const CAQD_GUIDE: Record<string, Record<string, string>> = {
  "Revenue / Gross Receipts": {
    "Low Risk": "0.80% \u2013 1.00%",
    "Medium Risk": "0.70% \u2013 0.80%",
    "High Risk": "0.50% \u2013 0.70%"
  },
  "Profit Before Tax": {
    "Low Risk": "8% \u2013 10%",
    "Medium Risk": "7% \u2013 8%",
    "High Risk": "5% \u2013 7%"
  },
  "Total Assets": {
    "Low Risk": "1.6% \u2013 2.0%",
    "Medium Risk": "1.3% \u2013 1.6%",
    "High Risk": "1.0% \u2013 1.3%"
  },
  "Net Worth": {
    "Low Risk": "3.85% \u2013 5.0%",
    "Medium Risk": "3.15% \u2013 3.85%",
    "High Risk": "2.0% \u2013 3.15%"
  }
};

// RISK FACTORS
const DEFAULT_RISK_FACTORS = [
  "New Engagement",
  "Startup Entity",
  "Client acceptance / continuance concerns",
  "Integrity of management",
  "Operating effectiveness of controls",
  "Effectiveness of Internal Audit",
  "Ongoing investigations",
  "Negative publicity",
  "Complexity in operations / structure",
  "Economic / regulatory changes",
  "Going concern & liquidity issues",
  "Threat of bankruptcy",
  "New IT systems affecting financial reporting",
  "History of fraud or error",
  "Risk of management override",
  "Capital / credit constraints",
  "Complex financing arrangements",
  "Corporate restructuring",
  "Significant change from prior period",
  "Related party transactions",
  "Change / exit of key personnel",
  "IFCoFR / internal control weakness",
  "Inefficient accounting systems",
  "Prior audit qualification",
  "Change in accounting policies",
  "Rapid growth / unusual profitability",
  "Any other auditor-considered significant risk"
];

interface RiskItem {
  level: string;
  score: number;
}

const sanitizeNumericInput = (value: string, options?: { allowTrailingDot?: boolean }) => {
  const cleaned = value.replace(/,/g, '');
  const hasTrailingDot = options?.allowTrailingDot && cleaned.endsWith('.');
  const parts = cleaned.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  const fracPart = parts.length > 1 ? parts.slice(1).join('').replace(/\D/g, '') : '';
  if (fracPart) return `${intPart}.${fracPart}`;
  if (hasTrailingDot) return `${intPart}.`;
  return intPart;
};

const formatIndianNumber = (value: string) => {
  const cleaned = sanitizeNumericInput(value);
  if (!cleaned) return '';
  const [intPart, fracPart] = cleaned.split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const formatted = rest ? `${grouped},${last3}` : last3;
  return fracPart ? `${formatted}.${fracPart}` : formatted;
};

const parseNumber = (value: string) => {
  const cleaned = sanitizeNumericInput(value);
  const parsed = Number(cleaned || 0);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sanitizeNumericLoose = (value: string) => sanitizeNumericInput(value, { allowTrailingDot: true });
const sanitizeNumericStrict = (value: string) => sanitizeNumericInput(value);

export default function Materiality() {
  // Engagement Context
  const { currentEngagement } = useEngagement();
  const { user } = useAuth();
  const { members } = useTeamMembers();
  
  // View State
  const [currentView, setCurrentView] = useState<'risk' | 'materiality' | 'register'>('risk');
  
  // Header Fields
  const [entityName, setEntityName] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [materialityStage, setMaterialityStage] = useState('Planning');
  const [engagementType, setEngagementType] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [date, setDate] = useState(format(new Date(), 'dd-MM-yyyy'));

  // Auto-populate from engagement
  useEffect(() => {
    if (currentEngagement) {
      setEntityName(currentEngagement.client_name || '');
      setFinancialYear(currentEngagement.financial_year || '');
      setEngagementType(currentEngagement.engagement_type || '');
    }
  }, [currentEngagement]);

  // Financial Base
  const [profitBeforeTax, setProfitBeforeTax] = useState('');
  const [revenue, setRevenue] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [othersName, setOthersName] = useState('');
  const [othersAmount, setOthersAmount] = useState('');

  // Materiality
  const [benchmark, setBenchmark] = useState('Profit Before Tax');
  const [percentage, setPercentage] = useState('8');
  const [omAmount, setOmAmount] = useState(0);
  const [pmPercentage, setPmPercentage] = useState('75');
  const [pmAmount, setPmAmount] = useState(0);
  const [ctPercentage, setCtPercentage] = useState('5');
  const [ctAmount, setCtAmount] = useState(0);
  const [rationale, setRationale] = useState(sampleMateriality.rationale);

  // Risk Assessment
  const [riskFactors, setRiskFactors] = useState<string[]>(DEFAULT_RISK_FACTORS);
  const [riskItems, setRiskItems] = useState<Record<number, RiskItem>>({});
  const [newQuestion, setNewQuestion] = useState('');
  const [totalRiskScore, setTotalRiskScore] = useState(0);
  const [riskPercentage, setRiskPercentage] = useState(0);
  const [systemRisk, setSystemRisk] = useState('');
  const [finalRisk, setFinalRisk] = useState('');
  const [isRiskFinalized, setIsRiskFinalized] = useState(false);
  const [remarks, setRemarks] = useState('');

  // CAQD Guidance
  const [caqdSuggestion, setCaqdSuggestion] = useState('\u2014');
  const isHydratingRef = useRef(false);

  const buildRiskStatePayload = () => ({
    riskFactors,
    riskItems,
    newQuestion,
    totalRiskScore,
    riskPercentage,
    systemRisk,
    finalRisk,
    isRiskFinalized,
    remarks,
  });

  const buildMaterialityStatePayload = () => ({
    entityName,
    financialYear,
    materialityStage,
    engagementType,
    preparedBy,
    reviewedBy,
    date,
    profitBeforeTax: parseNumber(profitBeforeTax),
    revenue: parseNumber(revenue),
    totalAssets: parseNumber(totalAssets),
    netWorth: parseNumber(netWorth),
    othersName,
    othersAmount: parseNumber(othersAmount),
    benchmark,
    percentage: parseNumber(percentage),
    omAmount,
    pmPercentage: parseNumber(pmPercentage),
    pmAmount,
    ctPercentage: parseNumber(ctPercentage),
    ctAmount,
    rationale,
    caqdSuggestion,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!currentEngagement?.id) return;
      isHydratingRef.current = true;
      try {
        const { data, error } = await supabase
          .from('materiality_risk_assessment')
          .select('*')
          .eq('engagement_id', currentEngagement.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const riskState = (data.risk_state || {}) as Record<string, any>;
        const materialityState = (data.materiality_state || {}) as Record<string, any>;

        if (Array.isArray(riskState.riskFactors)) setRiskFactors(riskState.riskFactors);
        if (riskState.riskItems) setRiskItems(riskState.riskItems);
        if (typeof riskState.newQuestion === 'string') setNewQuestion(riskState.newQuestion);
        if (typeof riskState.totalRiskScore === 'number') setTotalRiskScore(riskState.totalRiskScore);
        if (typeof riskState.riskPercentage === 'number') setRiskPercentage(riskState.riskPercentage);
        if (typeof riskState.systemRisk === 'string') setSystemRisk(riskState.systemRisk);
        if (typeof riskState.finalRisk === 'string') setFinalRisk(riskState.finalRisk);
        if (typeof riskState.isRiskFinalized === 'boolean') setIsRiskFinalized(riskState.isRiskFinalized);
        if (typeof riskState.remarks === 'string') setRemarks(riskState.remarks);

        if (typeof materialityState.entityName === 'string') setEntityName(materialityState.entityName);
        if (typeof materialityState.financialYear === 'string') setFinancialYear(materialityState.financialYear);
        if (typeof materialityState.materialityStage === 'string') setMaterialityStage(materialityState.materialityStage);
        if (typeof materialityState.engagementType === 'string') setEngagementType(materialityState.engagementType);
        if (typeof materialityState.preparedBy === 'string') setPreparedBy(materialityState.preparedBy);
        if (typeof materialityState.reviewedBy === 'string') setReviewedBy(materialityState.reviewedBy);
        if (typeof materialityState.date === 'string') setDate(materialityState.date);
        if (typeof materialityState.profitBeforeTax === 'number') setProfitBeforeTax(formatIndianNumber(String(materialityState.profitBeforeTax)));
        if (typeof materialityState.revenue === 'number') setRevenue(formatIndianNumber(String(materialityState.revenue)));
        if (typeof materialityState.totalAssets === 'number') setTotalAssets(formatIndianNumber(String(materialityState.totalAssets)));
        if (typeof materialityState.netWorth === 'number') setNetWorth(formatIndianNumber(String(materialityState.netWorth)));
        if (typeof materialityState.othersName === 'string') setOthersName(materialityState.othersName);
        if (typeof materialityState.othersAmount === 'number') setOthersAmount(formatIndianNumber(String(materialityState.othersAmount)));
        if (typeof materialityState.benchmark === 'string') setBenchmark(materialityState.benchmark);
        if (typeof materialityState.percentage === 'number') setPercentage(String(materialityState.percentage));
        if (typeof materialityState.omAmount === 'number') setOmAmount(materialityState.omAmount);
        if (typeof materialityState.pmPercentage === 'number') setPmPercentage(String(materialityState.pmPercentage));
        if (typeof materialityState.pmAmount === 'number') setPmAmount(materialityState.pmAmount);
        if (typeof materialityState.ctPercentage === 'number') setCtPercentage(String(materialityState.ctPercentage));
        if (typeof materialityState.ctAmount === 'number') setCtAmount(materialityState.ctAmount);
        if (typeof materialityState.rationale === 'string') setRationale(materialityState.rationale);
        if (typeof materialityState.caqdSuggestion === 'string') setCaqdSuggestion(materialityState.caqdSuggestion);
      } catch (e) {
        console.error('Failed to load materiality risk assessment:', e);
      } finally {
        isHydratingRef.current = false;
      }
    };

    loadData();
  }, [currentEngagement?.id]);

  useEffect(() => {
    if (!currentEngagement?.id) return;
    if (isHydratingRef.current) return;

    const timeout = setTimeout(async () => {
      try {
        const payload = {
          engagement_id: currentEngagement.id,
          risk_state: buildRiskStatePayload(),
          materiality_state: buildMaterialityStatePayload(),
          updated_by: user?.id || null,
          created_by: user?.id || null,
        };

        const { error } = await supabase
          .from('materiality_risk_assessment')
          .upsert(payload, { onConflict: 'engagement_id' });

        if (error) throw error;
      } catch (e) {
        console.error('Failed to save materiality risk assessment:', e);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    currentEngagement?.id,
    riskFactors,
    riskItems,
    newQuestion,
    totalRiskScore,
    riskPercentage,
    systemRisk,
    finalRisk,
    isRiskFinalized,
    remarks,
    entityName,
    financialYear,
    materialityStage,
    engagementType,
    preparedBy,
    reviewedBy,
    date,
    profitBeforeTax,
    revenue,
    totalAssets,
    netWorth,
    othersName,
    othersAmount,
    benchmark,
    percentage,
    omAmount,
    pmPercentage,
    pmAmount,
    ctPercentage,
    ctAmount,
    rationale,
    caqdSuggestion,
    user?.id,
  ]);

  // Calculate risk totals
  useEffect(() => {
    let total = 0;
    let count = 0;

    Object.values(riskItems).forEach((item) => {
      if (item.level !== 'NA') {
        total += item.score;
        count += 1;
      }
    });

    setTotalRiskScore(total);

    if (count === 0) {
      setRiskPercentage(0);
      setSystemRisk('');
      if (!isRiskFinalized) {
        setFinalRisk('');
      }
      return;
    }

    const pct = Math.round((total / (count * 10)) * 1000) / 10;
    setRiskPercentage(pct);

    const calculatedRisk = pct <= 40 ? 'Low Risk' : pct <= 70 ? 'Medium Risk' : 'High Risk';
    setSystemRisk(calculatedRisk);
    
    if (!isRiskFinalized) {
      setFinalRisk(calculatedRisk);
    }
  }, [riskItems, isRiskFinalized]);

  // Update CAQD guidance
  useEffect(() => {
    const risk = finalRisk || systemRisk;
    if (benchmark in CAQD_GUIDE && risk in CAQD_GUIDE[benchmark]) {
      setCaqdSuggestion(`Suggested range (ICAI-CAQD): ${CAQD_GUIDE[benchmark][risk]}`);
    } else {
      setCaqdSuggestion('Suggested range: Benchmark not defined');
    }
  }, [benchmark, finalRisk, systemRisk]);

  const getBenchmarkAmount = () => {
    switch (benchmark) {
      case 'Profit Before Tax':
        return parseNumber(profitBeforeTax);
      case 'Revenue / Gross Receipts':
        return parseNumber(revenue);
      case 'Total Assets':
        return parseNumber(totalAssets);
      case 'Net Worth':
        return parseNumber(netWorth);
      case 'Others':
        return parseNumber(othersAmount);
      default:
        return 0;
    }
  };

  const calculateOM = () => {
    if (!currentEngagement) {
      alert('Please select an engagement first to proceed with materiality calculations.');
      return;
    }
    
    const base = getBenchmarkAmount();
    const percentageValue = parseNumber(percentage);
    const om = base * (percentageValue / 100);
    setOmAmount(Number(om.toFixed(2)));

    // Check if percentage is within suggested range
    const risk = finalRisk || systemRisk;
    if (benchmark in CAQD_GUIDE && risk in CAQD_GUIDE[benchmark]) {
      const rangeStr = CAQD_GUIDE[benchmark][risk];
      const [min, max] = parseRange(rangeStr);
      if (percentageValue < min || percentageValue > max) {
        alert(`Warning: The selected materiality percentage (${percentageValue}%) is outside the suggested ICAI-CAQD range (${rangeStr}). Please review.`);
      }
    }
  };

  const calculatePM = () => {
    const pm = omAmount * (parseNumber(pmPercentage) / 100);
    setPmAmount(Number(pm.toFixed(2)));
  };

  const calculateCT = () => {
    const ct = omAmount * (parseNumber(ctPercentage) / 100);
    setCtAmount(Number(ct.toFixed(2)));
  };

  const parseRange = (rangeStr: string): [number, number] => {
    const parts = rangeStr.replace('%', '').split('\u2013').map(s => s.trim());
    return [parseFloat(parts[0]), parseFloat(parts[1])];
  };

  const handleRiskLevelChange = (index: number, level: string) => {
    let score = 0;
    if (level === 'High_Risk') score = 8;
    else if (level === 'Medium_Risk') score = 4;
    else if (level === 'Low_Risk') score = 1;
    
    setRiskItems(prev => ({
      ...prev,
      [index]: { level, score }
    }));
  };

  const handleRiskScoreChange = (index: number, score: number) => {
    setRiskItems(prev => ({
      ...prev,
      [index]: { ...prev[index], score }
    }));
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) {
      alert('Please enter a question.');
      return;
    }
    setRiskFactors([...riskFactors, newQuestion.trim()]);
    setNewQuestion('');
  };

  const deleteQuestion = (index: number) => {
    const newFactors = riskFactors.filter((_, i) => i !== index);
    const newItems = { ...riskItems };
    delete newItems[index];
    
    // Reindex items
    const reindexedItems: Record<number, RiskItem> = {};
    Object.keys(newItems).forEach((key) => {
      const oldIndex = parseInt(key);
      const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
      reindexedItems[newIndex] = newItems[oldIndex];
    });
    
    setRiskFactors(newFactors);
    setRiskItems(reindexedItems);
  };

  const resetAllQuestions = () => {
    setRiskFactors(DEFAULT_RISK_FACTORS);
    setRiskItems({});
    setIsRiskFinalized(false);
  };

  const finalizeRisk = () => {
    if (!finalRisk) {
      alert('Please select a risk level (Low Risk, Medium Risk, or High Risk) before finalizing.');
      return;
    }
    setIsRiskFinalized(true);
  };

  const switchToMateriality = () => {
    if (!isRiskFinalized || !finalRisk) {
      const result = window.confirm('Risk assessment is not finalized. Do you want to skip and proceed to materiality?');
      if (!result) {
        return;
      }
    }
    setCurrentView('materiality');
  };

  const switchToRisk = () => {
    setCurrentView('risk');
  };

  const switchToRegister = () => {
    setCurrentView('register');
  };

  const exportToExcel = async () => {
    if (!isRiskFinalized || !finalRisk) {
      const result = window.confirm('Risk assessment is not finalized. Do you want to skip and proceed with export?');
      if (!result) {
        return;
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Materiality & Risk');
    
    // Define heading style
    const headingStyle = {
      font: { bold: true, color: { argb: 'FF0000FF' } } // Blue color
    };
    
    // Header
    worksheet.addRow(['DETERMINING MATERIALITY']).getCell(1).font = headingStyle.font;
    worksheet.addRow(['Name of Entity', entityName]);
    worksheet.addRow(['Financial Year', financialYear]);
    worksheet.addRow(['Materiality Stage', materialityStage]);
    worksheet.addRow(['Type of Engagement', engagementType]);
    worksheet.addRow(['Prepared By', preparedBy]);
    worksheet.addRow(['Reviewed By', reviewedBy]);
    worksheet.addRow(['Date', date]);
    worksheet.addRow([]);
    
    // Financial Base
    worksheet.addRow(['FINANCIAL BASE']).getCell(1).font = headingStyle.font;
    worksheet.addRow(['Profit Before Tax', parseNumber(profitBeforeTax)]);
    worksheet.addRow(['Revenue / Gross Receipts', parseNumber(revenue)]);
    worksheet.addRow(['Total Assets', parseNumber(totalAssets)]);
    worksheet.addRow(['Net Worth', parseNumber(netWorth)]);
    worksheet.addRow([othersName || 'Others', parseNumber(othersAmount)]);
    worksheet.addRow([]);
    
    // Materiality
    worksheet.addRow(['MATERIALITY']).getCell(1).font = headingStyle.font;
    worksheet.addRow(['Benchmark Selected', benchmark]);
    worksheet.addRow(['Overall Materiality', omAmount]);
    worksheet.addRow(['Performance Materiality', pmAmount]);
    worksheet.addRow(['Clearly Trivial Threshold', ctAmount]);
    worksheet.addRow([]);
    
    // Risk Assessment
    worksheet.addRow(['RISK ASSESSMENT QUESTIONNAIRE']).getCell(1).font = headingStyle.font;
    worksheet.addRow(['Question', 'Risk Level', 'Score', 'Included']);
    riskFactors.forEach((factor, index) => {
      const item = riskItems[index];
      worksheet.addRow([
        factor,
        item?.level || 'NA',
        item?.score || 0,
        item?.level !== 'NA' ? 'Yes' : 'No'
      ]);
    });
    worksheet.addRow([]);
    
    // Risk Summary
    worksheet.addRow(['RISK SUMMARY']).getCell(1).font = headingStyle.font;
    worksheet.addRow(['Total Risk Score', totalRiskScore]);
    worksheet.addRow(['Risk %', `${riskPercentage}%`]);
    worksheet.addRow(['System Risk', systemRisk]);
    worksheet.addRow(['Auditor Override', finalRisk]);
    worksheet.addRow([]);
    
    // Remarks
    worksheet.addRow(['REMARKS/RATIONALE']).getCell(1).font = headingStyle.font;
    worksheet.addRow([remarks]);
    
    // Auto-resize columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Materiality_Risk_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'High Risk') return 'text-red-600';
    if (risk === 'Medium Risk') return 'text-orange-600';
    if (risk === 'Low Risk') return 'text-green-600';
    return 'text-gray-600';
  };

  const getScoreOptions = (level: string): number[] => {
    if (level === 'High_Risk') return [8, 9, 10];
    if (level === 'Medium_Risk') return [4, 5, 6];
    if (level === 'Low_Risk') return [1, 2, 3];
    return [0];
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `\u20B9${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `\u20B9${(amount / 100000).toFixed(2)} L`;
    }
    return `\u20B9${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Materiality & Risk Assessment Tool
          </h1>
          <p className="text-muted-foreground mt-1">
            Calculate materiality and assess risk of material misstatement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={currentView === 'risk' ? 'default' : 'outline'} 
            onClick={switchToRisk}
            className="gap-2"
          >
            Risk Assessment
          </Button>
          <Button 
            variant={currentView === 'materiality' ? 'default' : 'outline'} 
            onClick={switchToMateriality}
            className="gap-2"
          >
            Materiality
          </Button>
          <Button
            variant={currentView === 'register' ? 'default' : 'outline'}
            className="gap-2"
            onClick={switchToRegister}
          >
            <AlertTriangle className="h-4 w-4" />
            Risk Register
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportToExcel}>
            <FileDown className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {currentView === 'risk' ? (
        // RISK ASSESSMENT VIEW
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Assessment Matrix */}
            <div className="audit-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-foreground">Risk Assessment Questionnaire</h2>
                <Button variant="outline" size="sm" onClick={resetAllQuestions}>
                  Reset All Questions
                </Button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {riskFactors.map((factor, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-muted/50 rounded-lg">
                    <div className="col-span-5">
                      <Label className="text-sm">{factor}</Label>
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={riskItems[index]?.level || 'NA'}
                        onValueChange={(value) => handleRiskLevelChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High_Risk">High Risk</SelectItem>
                          <SelectItem value="Medium_Risk">Medium Risk</SelectItem>
                          <SelectItem value="Low_Risk">Low Risk</SelectItem>
                          <SelectItem value="NA">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={riskItems[index]?.score?.toString() || '0'}
                        onValueChange={(value) => handleRiskScoreChange(index, parseInt(value))}
                        disabled={!riskItems[index] || riskItems[index].level === 'NA'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getScoreOptions(riskItems[index]?.level || 'NA').map(score => (
                            <SelectItem key={score} value={score.toString()}>{score}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {index >= DEFAULT_RISK_FACTORS.length && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Question */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom risk factor..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                  />
                  <Button onClick={addQuestion} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Remarks/Rationale */}
            <div className="audit-card">
              <h2 className="font-semibold text-foreground mb-4">Remarks/Rationale</h2>
              <Textarea
                rows={6}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Document the rationale for risk assessment..."
                className="resize-none"
              />
            </div>
          </div>

          {/* Risk Summary Sidebar */}
          <div className="space-y-4">
            <div className="audit-card">
              <h3 className="font-medium text-foreground mb-4">Risk Conclusion</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Risk Score</Label>
                  <Input
                    value={totalRiskScore}
                    readOnly
                    className="mt-1 bg-muted"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Risk Percentage</Label>
                  <Input
                    value={`${riskPercentage}%`}
                    readOnly
                    className="mt-1 bg-muted"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">System Risk</Label>
                  <Input
                    value={systemRisk}
                    readOnly
                    className={`mt-1 bg-muted font-semibold ${getRiskColor(systemRisk)}`}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Auditor Override</Label>
                  <Select
                    value={finalRisk}
                    onValueChange={setFinalRisk}
                    disabled={isRiskFinalized}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low Risk">Low Risk</SelectItem>
                      <SelectItem value="Medium Risk">Medium Risk</SelectItem>
                      <SelectItem value="High Risk">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  onClick={finalizeRisk}
                  disabled={isRiskFinalized}
                >
                  {isRiskFinalized ? 'Risk Finalized' : 'Finalize Risk Conclusion'}
                </Button>
              </div>
            </div>

            <div className="audit-card text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Current Risk Level
              </p>
              <p className={`text-3xl font-bold ${getRiskColor(finalRisk || systemRisk)}`}>
                {finalRisk || systemRisk}
              </p>
            </div>
          </div>
        </div>
      ) : currentView === 'materiality' ? (
        // MATERIALITY VIEW
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Information */}
            <div className="audit-card">
              <h2 className="font-semibold text-foreground mb-4">Determining Materiality</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name of Entity</Label>
                  <Input 
                    value={entityName} 
                    readOnly 
                    className="bg-muted"
                    placeholder="Select an engagement first"
                  />
                  <p className="text-xs text-muted-foreground">Auto-populated from selected engagement</p>
                </div>
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Input 
                    value={financialYear} 
                    readOnly 
                    className="bg-muted"
                    placeholder="Select an engagement first"
                  />
                  <p className="text-xs text-muted-foreground">Auto-populated from selected engagement</p>
                </div>
                <div className="space-y-2">
                  <Label>Materiality Stage</Label>
                  <Input value={materialityStage} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Type of Engagement</Label>
                  <Input 
                    value={engagementType} 
                    readOnly 
                    className="bg-muted"
                    placeholder="Select an engagement first"
                  />
                  <p className="text-xs text-muted-foreground">Auto-populated from selected engagement</p>
                </div>
                <div className="space-y-2">
                  <Label>Prepared By</Label>
                  <Select value={preparedBy} onValueChange={setPreparedBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.full_name}>
                          {member.full_name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reviewed By</Label>
                  <Select value={reviewedBy} onValueChange={setReviewedBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.filter(m => m.role === 'partner' || m.role === 'manager').map((member) => (
                        <SelectItem key={member.user_id} value={member.full_name}>
                          {member.full_name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Financial Base */}
            <div className="audit-card">
              <h2 className="font-semibold text-foreground mb-4">Financial Base</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Profit Before Tax</Label>
                  <Input
                    inputMode="decimal"
                    value={profitBeforeTax}
                    onChange={(e) => setProfitBeforeTax(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setProfitBeforeTax(formatIndianNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(parseNumber(profitBeforeTax))}</p>
                </div>
                <div className="space-y-2">
                  <Label>Revenue / Gross Receipts</Label>
                  <Input
                    value={revenue}
                    inputMode="decimal"
                    onChange={(e) => setRevenue(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setRevenue(formatIndianNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(parseNumber(revenue))}</p>
                </div>
                <div className="space-y-2">
                  <Label>Total Assets</Label>
                  <Input
                    value={totalAssets}
                    inputMode="decimal"
                    onChange={(e) => setTotalAssets(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setTotalAssets(formatIndianNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(parseNumber(totalAssets))}</p>
                </div>
                <div className="space-y-2">
                  <Label>Net Worth</Label>
                  <Input
                    value={netWorth}
                    inputMode="decimal"
                    onChange={(e) => setNetWorth(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setNetWorth(formatIndianNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(parseNumber(netWorth))}</p>
                </div>
                <div className="space-y-2">
                  <Label>Others Name</Label>
                  <Input
                    value={othersName}
                    onChange={(e) => setOthersName(e.target.value)}
                    placeholder="e.g., Gross Profit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Others Amount</Label>
                  <Input
                    value={othersAmount}
                    inputMode="decimal"
                    onChange={(e) => setOthersAmount(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setOthersAmount(formatIndianNumber(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(parseNumber(othersAmount))}</p>
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div className="audit-card">
              <h2 className="font-semibold text-foreground mb-4">Materiality Rationale</h2>
              <Textarea
                rows={4}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Document the rationale for the selected benchmark and percentage..."
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Explain why the chosen benchmark is appropriate for this entity and stakeholders.
              </p>
            </div>


          </div>

          {/* Right Column - Calculations */}
          <div className="space-y-4">
            {/* Risk Level Display */}
            <div className="audit-card text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Risk Level
              </p>
              <p className={`text-2xl font-bold ${getRiskColor(finalRisk || systemRisk)}`}>
                {finalRisk || systemRisk || 'Not Assessed'}
              </p>
            </div>

            {/* CAQD Guidance */}
            <div className="audit-card">
              <h3 className="font-medium text-foreground mb-3 text-sm">
                ICAI-CAQD Suggested Materiality Range
              </h3>
              <p className="text-sm text-muted-foreground italic mb-2">{caqdSuggestion}</p>
              <p className="text-xs text-muted-foreground">
                Suggested range based on concluded Risk of Material Misstatement. 
                This is guidance only. Auditor judgment prevails.
              </p>
            </div>

            {/* Overall Materiality */}
            <div className="audit-card">
              <h3 className="font-medium text-foreground mb-3">Overall Materiality</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Benchmark</Label>
                  <Select value={benchmark} onValueChange={setBenchmark}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Profit Before Tax">Profit Before Tax</SelectItem>
                      <SelectItem value="Revenue / Gross Receipts">Revenue / Gross Receipts</SelectItem>
                      <SelectItem value="Total Assets">Total Assets</SelectItem>
                      <SelectItem value="Net Worth">Net Worth</SelectItem>
                      {othersName && <SelectItem value="Others">{othersName}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    value={percentage}
                    inputMode="decimal"
                    onChange={(e) => setPercentage(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setPercentage(sanitizeNumericStrict(e.target.value))}
                  />
                </div>
                <Button className="w-full" onClick={calculateOM}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(omAmount)}</p>
                </div>
              </div>
            </div>

            {/* Performance Materiality */}
            <div className="audit-card">
              <h3 className="font-medium text-foreground mb-3">Performance Materiality</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Percentage of OM (%)</Label>
                  <Input
                    value={pmPercentage}
                    inputMode="decimal"
                    placeholder="e.g., 75"
                    onChange={(e) => setPmPercentage(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setPmPercentage(sanitizeNumericStrict(e.target.value))}
                  />
                </div>
                <Button className="w-full" onClick={calculatePM}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(pmAmount)}</p>
                </div>
              </div>
            </div>

            {/* Clearly Trivial */}
            <div className="audit-card">
              <h3 className="font-medium text-foreground mb-3">Clearly Trivial Threshold</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Percentage of OM (%)</Label>
                  <Input
                    value={ctPercentage}
                    inputMode="decimal"
                    placeholder="e.g., 5"
                    onChange={(e) => setCtPercentage(sanitizeNumericLoose(e.target.value))}
                    onBlur={(e) => setCtPercentage(sanitizeNumericStrict(e.target.value))}
                  />
                </div>
                <Button className="w-full" onClick={calculateCT}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(ctAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Risk Register</div>
          </div>
          <RiskRegisterContent showPageHeader={false} />
        </div>
      )}
    </div>
  );
}

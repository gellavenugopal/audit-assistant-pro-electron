import { useState, useEffect } from 'react';
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
import { Calculator, AlertCircle, Trash2, Plus, FileDown, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useEngagement } from '@/contexts/EngagementContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';

// ICAI-CAQD SUGGESTED MATERIALITY GUIDANCE (ADVISORY)
const CAQD_GUIDE: Record<string, Record<string, string>> = {
  "Revenue / Gross Receipts": {
    "Low Risk": "0.80% – 1.00%",
    "Medium Risk": "0.70% – 0.80%",
    "High Risk": "0.50% – 0.70%"
  },
  "Profit Before Tax": {
    "Low Risk": "8% – 10%",
    "Medium Risk": "7% – 8%",
    "High Risk": "5% – 7%"
  },
  "Total Assets": {
    "Low Risk": "1.6% – 2.0%",
    "Medium Risk": "1.3% – 1.6%",
    "High Risk": "1.0% – 1.3%"
  },
  "Net Worth": {
    "Low Risk": "3.85% – 5.0%",
    "Medium Risk": "3.15% – 3.85%",
    "High Risk": "2.0% – 3.15%"
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

export default function Materiality() {
  // Engagement Context
  const { currentEngagement, engagements, setCurrentEngagement } = useEngagement();
  const { members } = useTeamMembers();
  
  // View State
  const [currentView, setCurrentView] = useState<'risk' | 'materiality'>('risk');
  
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
  const [profitBeforeTax, setProfitBeforeTax] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [othersName, setOthersName] = useState('');
  const [othersAmount, setOthersAmount] = useState(0);

  // Materiality
  const [benchmark, setBenchmark] = useState('Profit Before Tax');
  const [percentage, setPercentage] = useState(5);
  const [omAmount, setOmAmount] = useState(0);
  const [pmPercentage, setPmPercentage] = useState(75);
  const [pmAmount, setPmAmount] = useState(0);
  const [ctPercentage, setCtPercentage] = useState(5);
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
  const [caqdSuggestion, setCaqdSuggestion] = useState('—');

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
        return profitBeforeTax;
      case 'Revenue / Gross Receipts':
        return revenue;
      case 'Total Assets':
        return totalAssets;
      case 'Net Worth':
        return netWorth;
      case 'Others':
        return othersAmount;
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
    const om = base * (percentage / 100);
    setOmAmount(Number(om.toFixed(2)));

    // Check if percentage is within suggested range
    const risk = finalRisk || systemRisk;
    if (benchmark in CAQD_GUIDE && risk in CAQD_GUIDE[benchmark]) {
      const rangeStr = CAQD_GUIDE[benchmark][risk];
      const [min, max] = parseRange(rangeStr);
      if (percentage < min || percentage > max) {
        alert(`Warning: The selected materiality percentage (${percentage}%) is outside the suggested ICAI-CAQD range (${rangeStr}). Please review.`);
      }
    }
  };

  const calculatePM = () => {
    const pm = omAmount * (pmPercentage / 100);
    setPmAmount(Number(pm.toFixed(2)));
  };

  const calculateCT = () => {
    const ct = omAmount * (ctPercentage / 100);
    setCtAmount(Number(ct.toFixed(2)));
  };

  const parseRange = (rangeStr: string): [number, number] => {
    const parts = rangeStr.replace('%', '').split('–').map(s => s.trim());
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

  const exportToExcel = () => {
    if (!isRiskFinalized || !finalRisk) {
      const result = window.confirm('Risk assessment is not finalized. Do you want to skip and proceed with export?');
      if (!result) {
        return;
      }
    }

    const data = [];
    
    // Header
    data.push(['DETERMINING MATERIALITY']);
    data.push(['Name of Entity', entityName]);
    data.push(['Financial Year', financialYear]);
    data.push(['Materiality Stage', materialityStage]);
    data.push(['Type of Engagement', engagementType]);
    data.push(['Prepared By', preparedBy]);
    data.push(['Reviewed By', reviewedBy]);
    data.push(['Date', date]);
    data.push([]);
    
    // Financial Base
    data.push(['FINANCIAL BASE']);
    data.push(['Profit Before Tax', profitBeforeTax]);
    data.push(['Revenue / Gross Receipts', revenue]);
    data.push(['Total Assets', totalAssets]);
    data.push(['Net Worth', netWorth]);
    data.push([othersName || 'Others', othersAmount]);
    data.push([]);
    
    // Materiality
    data.push(['MATERIALITY']);
    data.push(['Benchmark Selected', benchmark]);
    data.push(['Overall Materiality', omAmount]);
    data.push(['Performance Materiality', pmAmount]);
    data.push(['Clearly Trivial Threshold', ctAmount]);
    data.push([]);
    
    // Risk Assessment
    data.push(['RISK ASSESSMENT QUESTIONNAIRE']);
    data.push(['Question', 'Risk Level', 'Score', 'Included']);
    riskFactors.forEach((factor, index) => {
      const item = riskItems[index];
      data.push([
        factor,
        item?.level || 'NA',
        item?.score || 0,
        item?.level !== 'NA' ? 'Yes' : 'No'
      ]);
    });
    data.push([]);
    
    // Risk Summary
    data.push(['RISK SUMMARY']);
    data.push(['Total Risk Score', totalRiskScore]);
    data.push(['Risk %', `${riskPercentage}%`]);
    data.push(['System Risk', systemRisk]);
    data.push(['Auditor Override', finalRisk]);
    data.push([]);
    
    // Remarks
    data.push(['REMARKS/RATIONALE']);
    data.push([remarks]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiality & Risk');
    XLSX.writeFile(wb, `Materiality_Risk_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          <h1 className="text-2xl font-bold text-foreground">
            ICAI – Materiality & Risk Assessment Tool (SA-320)
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
          <Button variant="outline" className="gap-2" onClick={exportToExcel}>
            <FileDown className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Engagement Selector */}
      <div className="audit-card">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <Label className="text-sm font-medium">Select Engagement</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Choose an engagement to auto-populate entity and financial year details
            </p>
          </div>
          <div className="w-96">
            <Select
              value={currentEngagement?.id || ''}
              onValueChange={(value) => {
                const selected = engagements.find(e => e.id === value);
                setCurrentEngagement(selected || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an engagement..." />
              </SelectTrigger>
              <SelectContent>
                {engagements.map((engagement) => (
                  <SelectItem key={engagement.id} value={engagement.id}>
                    {engagement.client_name} - {engagement.financial_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {currentEngagement && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Entity:</span>
                <span className="ml-2 font-medium">{currentEngagement.client_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Financial Year:</span>
                <span className="ml-2 font-medium">{currentEngagement.financial_year}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Engagement Type:</span>
                <span className="ml-2 font-medium capitalize">{currentEngagement.engagement_type}</span>
              </div>
            </div>
          </div>
        )}
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
      ) : (
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
                    type="number"
                    value={profitBeforeTax}
                    onChange={(e) => setProfitBeforeTax(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(profitBeforeTax)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Revenue / Gross Receipts</Label>
                  <Input
                    type="number"
                    value={revenue}
                    onChange={(e) => setRevenue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(revenue)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Total Assets</Label>
                  <Input
                    type="number"
                    value={totalAssets}
                    onChange={(e) => setTotalAssets(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(totalAssets)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Net Worth</Label>
                  <Input
                    type="number"
                    value={netWorth}
                    onChange={(e) => setNetWorth(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(netWorth)}</p>
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
                    type="number"
                    value={othersAmount}
                    onChange={(e) => setOthersAmount(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">{formatCurrency(othersAmount)}</p>
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
                    type="number"
                    step="0.1"
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
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
                    type="number"
                    step="1"
                    value={pmPercentage}
                    onChange={(e) => setPmPercentage(Number(e.target.value))}
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
                    type="number"
                    step="1"
                    value={ctPercentage}
                    onChange={(e) => setCtPercentage(Number(e.target.value))}
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
      )}
    </div>
  );
}

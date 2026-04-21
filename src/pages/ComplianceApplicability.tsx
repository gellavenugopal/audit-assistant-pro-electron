
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Minus, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEngagement } from "@/contexts/EngagementContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSQLiteClient } from "@/integrations/sqlite/client";

const db = getSQLiteClient();

const UNIT_MAP = {
  "Ones (\u20B9)": 1,
  "Thousands (\u20B91,000)": 1_000,
  "Lakhs (\u20B91,00,000)": 1_00_000,
  "Crores (\u20B91,00,00,000)": 1_00_00_000,
};

const ENTITY_CLASSIFICATION_MAP = {
  Company: [
    "Private Limited Company",
    "Public Limited Company (Unlisted)",
    "Listed Company",
    "Section 8 Company",
    "One Person Company (OPC)",
  ],
  "Non-Company": [
    "Individual / HUF",
    "Partnership Firm",
    "LLP",
  ],
};

const STATUTE_LINKS: Record<string, string> = {
  "Section 2(85)": "https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf",
  "Section 139(2)": "https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf",
  "Section 135": "https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf",
  "Section 188": "https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf",
  "Section 143(3)(i)": "https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf",
  "Section 129 & Schedule III": "https://www.mca.gov.in/Ministry/pdf/ScheduleIIICompaniesAct.pdf",
  "CARO 2020": "https://www.mca.gov.in/Ministry/pdf/CARO2020_25022020.pdf",
  "Section 44AB": "https://incometaxindia.gov.in/Acts/Income-tax%20Act,%201961.pdf",
};

const yesNoOptions = [
  { label: "No", value: "No" },
  { label: "Yes", value: "Yes" },
];

const ComplianceApplicability: React.FC = () => {
  const { currentEngagement } = useEngagement();
  const { user } = useAuth();
  // State for all input fields
  const [denomination, setDenomination] = useState("Ones (\u20B9)");
  const [cyTurnover, setCyTurnover] = useState("");
  const [cyCapital, setCyCapital] = useState("");
  const [pyTurnover, setPyTurnover] = useState("");
  const [pyNetworth, setPyNetworth] = useState("");
  const [pyBorrowings, setPyBorrowings] = useState("");
  const [pyNetprofit, setPyNetprofit] = useState("");

  const [assesseeType, setAssesseeType] = useState("Business");
  const [cashReceipt, setCashReceipt] = useState("No");
  const [cashPayment, setCashPayment] = useState("No");
  const [presumptive, setPresumptive] = useState("No");
  const [lowerPresumptive, setLowerPresumptive] = useState("No");
  const [rpt, setRpt] = useState("No");

  const [entityClass, setEntityClass] = useState("Company");
  const [constitution, setConstitution] = useState(ENTITY_CLASSIFICATION_MAP["Company"][0]);
  const [subConstitution, setSubConstitution] = useState("Neither");
  const [dormant, setDormant] = useState("No");

  // Results
  const [results, setResults] = useState<Array<[string, string, string]>>([]);
  const [resultReasons, setResultReasons] = useState<Array<[string, string]>>([]);
  const isHydratingRef = useRef(false);

  const buildInputsPayload = () => ({
    denomination,
    cyTurnover,
    cyCapital,
    pyTurnover,
    pyNetworth,
    pyBorrowings,
    pyNetprofit,
    assesseeType,
    cashReceipt,
    cashPayment,
    presumptive,
    lowerPresumptive,
    rpt,
    entityClass,
    constitution,
    subConstitution,
    dormant,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!currentEngagement?.id) return;
      isHydratingRef.current = true;
      try {
        const { data, error } = await db
          .from('compliance_applicability')
          .select('*')
          .eq('engagement_id', currentEngagement.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const inputs = (data.inputs || {}) as Record<string, string>;
        setDenomination(inputs.denomination || "Ones (\u20B9)");
        setCyTurnover(inputs.cyTurnover || "");
        setCyCapital(inputs.cyCapital || "");
        setPyTurnover(inputs.pyTurnover || "");
        setPyNetworth(inputs.pyNetworth || "");
        setPyBorrowings(inputs.pyBorrowings || "");
        setPyNetprofit(inputs.pyNetprofit || "");
        setAssesseeType(inputs.assesseeType || "Business");
        setCashReceipt(inputs.cashReceipt || "No");
        setCashPayment(inputs.cashPayment || "No");
        setPresumptive(inputs.presumptive || "No");
        setLowerPresumptive(inputs.lowerPresumptive || "No");
        setRpt(inputs.rpt || "No");
        setEntityClass(inputs.entityClass || "Company");
        setConstitution(inputs.constitution || ENTITY_CLASSIFICATION_MAP["Company"][0]);
        setSubConstitution(inputs.subConstitution || "Neither");
        setDormant(inputs.dormant || "No");
        setResults((data.results || []) as Array<[string, string, string]>);
        setResultReasons((data.reasons || []) as Array<[string, string]>);
      } catch (e) {
        console.error('Failed to load compliance applicability:', e);
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
          inputs: buildInputsPayload(),
          results,
          reasons: resultReasons,
          updated_by: user?.id || null,
          created_by: user?.id || null,
        };

        const { error } = await db
          .from('compliance_applicability')
          .upsert(payload, { onConflict: 'engagement_id' });

        if (error) throw error;
      } catch (e) {
        console.error('Failed to save compliance applicability:', e);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    currentEngagement?.id,
    denomination,
    cyTurnover,
    cyCapital,
    pyTurnover,
    pyNetworth,
    pyBorrowings,
    pyNetprofit,
    assesseeType,
    cashReceipt,
    cashPayment,
    presumptive,
    lowerPresumptive,
    rpt,
    entityClass,
    constitution,
    subConstitution,
    dormant,
    results,
    resultReasons,
    user?.id,
  ]);

  // Update constitution options when entityClass changes
  React.useEffect(() => {
    const options = ENTITY_CLASSIFICATION_MAP[entityClass] || [];
    if (!options.includes(constitution)) {
      setConstitution(options[0] || '');
    }
  }, [constitution, entityClass]);

  function sanitizeNumeric(value: string) {
    const cleaned = value.replace(/,/g, "");
    const parts = cleaned.split(".");
    const intPart = parts[0].replace(/\D/g, "");
    const fracPart = parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "") : "";
    return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  }

  function formatIndianNumber(value: string) {
    const cleaned = sanitizeNumeric(value);
    if (!cleaned) return "";
    const [intPart, fracPart] = cleaned.split(".");
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    const formatted = rest ? `${grouped},${last3}` : last3;
    return fracPart ? `${formatted}.${fracPart}` : formatted;
  }

  function parseNumber(value: string) {
    const cleaned = sanitizeNumeric(value);
    return parseFloat(cleaned || "0");
  }

  // Logic functions
  function determineTaxAudit(turnover: number) {
    if (assesseeType === "Profession") {
      return turnover > 5_000_000 ? "Yes" : "No";
    }
    if (turnover > 100_000_000) return "Yes";
    if (
      turnover > 10_000_000 &&
      (cashReceipt === "Yes" || cashPayment === "Yes")
    ) {
      return "Yes";
    }
    if (presumptive === "Yes" && lowerPresumptive === "Yes") {
      return "Yes";
    }
    return "No";
  }

  function evaluateCompliance() {
    try {
      const m = UNIT_MAP[denomination];
      const cy_turnover = parseNumber(cyTurnover) * m;
      const cy_capital = parseNumber(cyCapital) * m;
      const py_turnover = parseNumber(pyTurnover) * m;
      const py_networth = parseNumber(pyNetworth) * m;
      const py_borrowings = parseNumber(pyBorrowings) * m;
      const py_netprofit = parseNumber(pyNetprofit) * m;

      const is_company = entityClass === "Company";
      const is_listed = constitution === "Listed Company";
      const is_opc = constitution === "One Person Company (OPC)";
      const is_section8 = constitution === "Section 8 Company";
      const is_dormant = dormant === "Yes";
      const is_holding = subConstitution === "Holding Company";
      const is_subsidiary = subConstitution === "Subsidiary Company";

      const small_company =
        is_company &&
        constitution !== "Public Limited Company (Unlisted)" &&
        !is_listed &&
        !is_opc &&
        !is_section8 &&
        !is_holding &&
        !is_subsidiary &&
        cy_capital <= 100_000_000 &&
        py_turnover <= 1_000_000_000;

      let caro = "";
      if (!is_company) caro = "Not Applicable";
      else if (is_listed) caro = "Yes";
      else if (small_company || is_opc || is_section8) caro = "No";
      else caro = "Yes";

      let auditor_rotation = "";
      if (!is_company) auditor_rotation = "Not Applicable";
      else if (is_listed) auditor_rotation = "Yes";
      else if (
        (constitution === "Public Limited Company (Unlisted)" && cy_capital >= 100_000_000) ||
        (constitution === "Private Limited Company" && cy_capital >= 500_000_000) ||
        py_borrowings >= 500_000_000
      ) {
        auditor_rotation = "Yes";
      } else auditor_rotation = "No";

      let csr = "";
      if (!is_company) csr = "Not Applicable";
      else if (
        py_networth >= 5_000_000_000 ||
        py_turnover >= 10_000_000_000 ||
        py_netprofit >= 50_000_000
      ) {
        csr = "Yes";
      } else csr = "No";

      let ifc = "";
      if (!is_company) ifc = "Not Applicable";
      else if (is_listed) ifc = "Yes";
      else if (constitution === "Public Limited Company (Unlisted)") ifc = "Yes";
      else if (
        constitution === "Private Limited Company" &&
        (py_turnover >= 500_000_000 || py_borrowings >= 250_000_000)
      ) {
        ifc = "Yes";
      } else ifc = "No";

      let cashflow = "";
      if (!is_company) cashflow = "Not Applicable";
      else if (small_company || is_opc || is_dormant) cashflow = "No";
      else cashflow = "Yes";

      const tax_audit = determineTaxAudit(cy_turnover);

      let aoc2 = "";
      if (!is_company) aoc2 = "Not Applicable";
      else aoc2 = rpt === "Yes" ? "Yes" : "No";

      const resultsArr: Array<[string, string, string]> = [
        [
          "Small Company",
          !is_company ? "Not Applicable" : small_company ? "Yes" : "No",
          "Section 2(85)",
        ],
        ["CARO Applicability", caro, "CARO 2020"],
        ["Auditor Rotation", auditor_rotation, "Section 139(2)"],
        ["CSR Applicability", csr, "Section 135"],
        ["Tax Audit Applicability", tax_audit, "Section 44AB"],
        ["Cash Flow Statement", cashflow, "Section 129 & Schedule III"],
        ["IFC Reporting", ifc, "Section 143(3)(i)"],
        ["AOC-2 (RPT)", aoc2, "Section 188"],
      ];
      const reasonsArr: Array<[string, string]> = [
        [
          "Small Company",
          !is_company
            ? "Not applicable because the entity is not a company."
            : small_company
              ? "Yes because paid-up capital <= 10 Cr and turnover <= 100 Cr, and the entity is not listed, OPC, Section 8, holding, or subsidiary."
              : "No because one or more thresholds or exclusions apply (listed/OPC/Section 8/holding/subsidiary or capital/turnover exceed limits).",
        ],
        [
          "CARO Applicability",
          !is_company
            ? "Not applicable because CARO applies only to companies."
            : is_listed
              ? "Yes because listed companies are covered under CARO."
              : small_company || is_opc || is_section8
                ? "No because small companies, OPCs, and Section 8 companies are exempt."
                : "Yes because the company is not exempt under CARO thresholds or category.",
        ],
        [
          "Auditor Rotation",
          !is_company
            ? "Not applicable because the entity is not a company."
            : auditor_rotation === "Yes"
              ? "Yes because paid-up capital or borrowings meet the rotation thresholds for the company type."
              : "No because the rotation thresholds are not met.",
        ],
        [
          "CSR Applicability",
          !is_company
            ? "Not applicable because the entity is not a company."
            : csr === "Yes"
              ? "Yes because net worth >= 500 Cr, turnover >= 1,000 Cr, or net profit >= 5 Cr."
              : "No because CSR thresholds are not met.",
        ],
        [
          "Tax Audit Applicability",
          tax_audit === "Yes"
            ? "Yes because turnover limits or cash receipt/payment or presumptive conditions trigger tax audit."
            : "No because tax audit thresholds and conditions are not met.",
        ],
        [
          "Cash Flow Statement",
          !is_company
            ? "Not applicable because the entity is not a company."
            : cashflow === "No"
              ? "No because the entity is a small company/OPC/dormant company."
              : "Yes because the entity is not exempt from cash flow requirements.",
        ],
        [
          "IFC Reporting",
          !is_company
            ? "Not applicable because the entity is not a company."
            : ifc === "Yes"
              ? "Yes because the company is listed, a public company, or a private company meeting turnover/borrowing thresholds."
              : "No because IFC thresholds are not met.",
        ],
        [
          "AOC-2 (RPT)",
          !is_company
            ? "Not applicable because the entity is not a company."
            : aoc2 === "Yes"
              ? "Yes because related party transactions are indicated."
              : "No because no related party transactions are indicated.",
        ],
      ];
      setResults(resultsArr);
      setResultReasons(reasonsArr);
    } catch (e) {
      setResults([]);
      setResultReasons([]);
    }
  }

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-4">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Compliance Applicability Engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Statutory applicability checks and audit planning signals in one view.
            </p>
          </div>
          <Button className="px-6" onClick={evaluateCompliance}>
            Evaluate Compliance
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm lg:h-full">
                <h2 className="text-sm font-semibold text-slate-700">Financial Parameters</h2>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Current Year Turnover</Label>
                    <Input
                      value={cyTurnover}
                      onChange={e => setCyTurnover(formatIndianNumber(e.target.value))}
                      onBlur={e => setCyTurnover(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid-up Capital</Label>
                    <Input
                      value={cyCapital}
                      onChange={e => setCyCapital(formatIndianNumber(e.target.value))}
                      onBlur={e => setCyCapital(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Year Turnover</Label>
                    <Input
                      value={pyTurnover}
                      onChange={e => setPyTurnover(formatIndianNumber(e.target.value))}
                      onBlur={e => setPyTurnover(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Year Net Worth</Label>
                    <Input
                      value={pyNetworth}
                      onChange={e => setPyNetworth(formatIndianNumber(e.target.value))}
                      onBlur={e => setPyNetworth(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Year Borrowings</Label>
                    <Input
                      value={pyBorrowings}
                      onChange={e => setPyBorrowings(formatIndianNumber(e.target.value))}
                      onBlur={e => setPyBorrowings(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Year Net Profit</Label>
                    <Input
                      value={pyNetprofit}
                      onChange={e => setPyNetprofit(formatIndianNumber(e.target.value))}
                      onBlur={e => setPyNetprofit(formatIndianNumber(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm flex-1">
                  <h2 className="text-sm font-semibold text-slate-700">Income-tax Parameters</h2>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Assessee Type</Label>
                      <Select value={assesseeType} onValueChange={setAssesseeType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Profession">Profession</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cash Receipts &gt; 5%</Label>
                      <Select value={cashReceipt} onValueChange={setCashReceipt}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {yesNoOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cash Payments &gt; 5%</Label>
                      <Select value={cashPayment} onValueChange={setCashPayment}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {yesNoOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Presumptive Scheme</Label>
                      <Select value={presumptive} onValueChange={setPresumptive}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {yesNoOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lower than Presumptive</Label>
                      <Select value={lowerPresumptive} onValueChange={setLowerPresumptive}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {yesNoOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm flex-1">
                  <h2 className="text-sm font-semibold text-slate-700">Company Law Parameters</h2>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Significant RPT Exists</Label>
                      <Select value={rpt} onValueChange={setRpt}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {yesNoOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm lg:col-span-2">
                <h2 className="text-sm font-semibold text-slate-700">Entity Classification</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount Denomination</Label>
                    <Select value={denomination} onValueChange={setDenomination}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(UNIT_MAP).map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <Select value={entityClass} onValueChange={setEntityClass}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Non-Company">Non-Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Constitution</Label>
                    <Select value={constitution} onValueChange={setConstitution}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENTITY_CLASSIFICATION_MAP[entityClass].map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-Constitution</Label>
                    <Select value={subConstitution} onValueChange={setSubConstitution}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Neither">Neither</SelectItem>
                        <SelectItem value="Holding Company">Holding Company</SelectItem>
                        <SelectItem value="Subsidiary Company">Subsidiary Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dormant Company</Label>
                    <Select value={dormant} onValueChange={setDormant}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yesNoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Evaluation Output</h2>
                  <p className="text-xs text-slate-500">Right-side results update on every run.</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                  {results.length} checks
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {results.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No evaluation yet. Click "Evaluate Compliance" to view outcomes.
                  </div>
                )}

                {results.map(([area, applicable, statute]) => {
                  const isYes = applicable === "Yes";
                  const isNo = applicable === "No";
                  const badgeClass = isYes
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isNo
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-50 text-slate-600 border-slate-200";

                  return (
                    <div key={area} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{area}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {STATUTE_LINKS[statute] ? (
                              <a
                                href={STATUTE_LINKS[statute]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-600 underline decoration-dotted underline-offset-4 hover:text-slate-900"
                              >
                                {statute}
                              </a>
                            ) : (
                              statute
                            )}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                          {isYes ? <CheckCircle2 className="h-4 w-4" /> : isNo ? <XCircle className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {isYes ? "Yes" : isNo ? "No" : "N/A"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Evaluation Basis</h3>
          {resultReasons.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Run evaluation to see the exact reason for each decision.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {resultReasons.map(([label, reason]) => (
                <li key={label}>
                  <span className="font-semibold text-slate-700">{label}:</span> {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceApplicability;



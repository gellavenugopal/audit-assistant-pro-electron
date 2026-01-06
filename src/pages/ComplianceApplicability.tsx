
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

const UNIT_MAP = {
  "Ones (₹)": 1,
  "Thousands (₹1,000)": 1_000,
  "Lakhs (₹1,00,000)": 1_00_000,
  "Crores (₹1,00,00,000)": 1_00_00_000,
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
  // State for all input fields
  const [denomination, setDenomination] = useState("Ones (₹)");
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

  // Update constitution options when entityClass changes
  React.useEffect(() => {
    setConstitution(ENTITY_CLASSIFICATION_MAP[entityClass][0]);
  }, [entityClass]);

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
      const cy_turnover = parseFloat(cyTurnover || "0") * m;
      const cy_capital = parseFloat(cyCapital || "0") * m;
      const py_turnover = parseFloat(pyTurnover || "0") * m;
      const py_networth = parseFloat(pyNetworth || "0") * m;
      const py_borrowings = parseFloat(pyBorrowings || "0") * m;
      const py_netprofit = parseFloat(pyNetprofit || "0") * m;

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
      setResults(resultsArr);
    } catch (e) {
      setResults([]);
    }
  }

  // UI
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Compliance Applicability Engine</h1>
      <p className="text-gray-600 mb-6">Statutory Applicability & Audit Planning Tool</p>

      {/* Input Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Financial Parameters */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-blue-800 mb-2 text-base">Financial Parameters</h2>
          <div className="space-y-2">
            <Label>Current Year Turnover</Label>
            <Input value={cyTurnover} onChange={e => setCyTurnover(e.target.value)} type="number" placeholder="0" />
            <Label>Paid-up Capital</Label>
            <Input value={cyCapital} onChange={e => setCyCapital(e.target.value)} type="number" placeholder="0" />
            <Label>Previous Year Turnover</Label>
            <Input value={pyTurnover} onChange={e => setPyTurnover(e.target.value)} type="number" placeholder="0" />
            <Label>Previous Year Net Worth</Label>
            <Input value={pyNetworth} onChange={e => setPyNetworth(e.target.value)} type="number" placeholder="0" />
            <Label>Previous Year Borrowings</Label>
            <Input value={pyBorrowings} onChange={e => setPyBorrowings(e.target.value)} type="number" placeholder="0" />
            <Label>Previous Year Net Profit</Label>
            <Input value={pyNetprofit} onChange={e => setPyNetprofit(e.target.value)} type="number" placeholder="0" />
          </div>
        </div>

        {/* Income-tax Parameters */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-blue-800 mb-2 text-base">Income-tax Parameters</h2>
          <div className="space-y-2">
            <Label>Assessee Type</Label>
            <Select value={assesseeType} onValueChange={setAssesseeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Profession">Profession</SelectItem>
              </SelectContent>
            </Select>
            <Label>Cash Receipts &gt; 5%</Label>
            <Select value={cashReceipt} onValueChange={setCashReceipt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yesNoOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Cash Payments &gt; 5%</Label>
            <Select value={cashPayment} onValueChange={setCashPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yesNoOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Presumptive Scheme</Label>
            <Select value={presumptive} onValueChange={setPresumptive}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yesNoOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Lower than Presumptive</Label>
            <Select value={lowerPresumptive} onValueChange={setLowerPresumptive}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yesNoOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>RPT Exists</Label>
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

        {/* Entity Classification */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-blue-800 mb-2 text-base">Entity Classification</h2>
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
            <Label>Entity Type</Label>
            <Select value={entityClass} onValueChange={setEntityClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Company">Company</SelectItem>
                <SelectItem value="Non-Company">Non-Company</SelectItem>
              </SelectContent>
            </Select>
            <Label>Constitution</Label>
            <Select value={constitution} onValueChange={setConstitution}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_CLASSIFICATION_MAP[entityClass].map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Sub-Constitution</Label>
            <Select value={subConstitution} onValueChange={setSubConstitution}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Neither">Neither</SelectItem>
                <SelectItem value="Holding Company">Holding Company</SelectItem>
                <SelectItem value="Subsidiary Company">Subsidiary Company</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Evaluate Button */}
      <div className="mb-8 text-center">
        <Button className="px-8 py-2 text-base font-semibold" onClick={evaluateCompliance}>
          Evaluate Compliance
        </Button>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compliance Area</TableHead>
                <TableHead>Applicable</TableHead>
                <TableHead>Statutory Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(([area, applicable, statute], i) => (
                <TableRow key={area}>
                  <TableCell>{area}</TableCell>
                  <TableCell className={applicable === "Yes" ? "font-bold bg-gray-100" : ""}>{applicable}</TableCell>
                  <TableCell>
                    {STATUTE_LINKS[statute] ? (
                      <a
                        href={STATUTE_LINKS[statute]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline hover:text-blue-900"
                      >
                        {statute}
                      </a>
                    ) : (
                      statute
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-8">
        © R. Rampuria &amp; Company | Chartered Accountants | Internal Professional Tool
      </div>
    </div>
  );
};

export default ComplianceApplicability;

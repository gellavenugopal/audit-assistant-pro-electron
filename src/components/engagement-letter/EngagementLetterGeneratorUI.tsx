import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Download, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { EngagementLetterMasterData } from '@/types/engagementLetter';
import { EngagementLetterGenerator } from '@/services/engagementLetterGenerator';
import { EngagementLetterDocxGenerator } from '@/services/engagementLetterDocxGenerator';

interface EngagementLetterGeneratorUIProps {
  engagementId?: string;
}

export function EngagementLetterGeneratorUI({ engagementId }: EngagementLetterGeneratorUIProps) {
  const [activeTab, setActiveTab] = useState('selection');
  const [generating, setGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Master data form state
  const [letterType, setLetterType] = useState<string>('');

  // Entity details
  const [entity, setEntity] = useState({
    entity_name: '',
    entity_type: 'Company' as const,
    entity_status: 'Unlisted Company' as const,
    registration_no: '',
    pan: '',
    gstin: '',
    registered_address: '',
    email: '',
    phone: '',
  });

  // Engagement period
  const [period, setPeriod] = useState({
    financial_year: '2024-25',
    assessment_year: '2024-25',
    balance_sheet_date: '2025-03-31',
    appointment_date: new Date().toISOString().split('T')[0],
  });

  // Auditor details
  const [auditor, setAuditor] = useState({
    firm_name: '',
    firm_reg_no: '',
    partner_name: '',
    partner_mem_no: '',
    partner_pan: '',
    place: '',
    letter_date: new Date().toISOString().split('T')[0],
  });

  // Commercial terms
  const [commercial, setCommercial] = useState({
    professional_fees: 50000,
    professional_fees_currency: 'INR',
    taxes_extra: true,
    payment_terms: '',
    out_of_pocket_exp: false,
  });

  // Management responsibilities
  const [mgmt_responsibilities, setMgmtResponsibilities] = useState({
    mgmt_responsibility_ack: true,
    books_responsibility_ack: true,
    internal_control_ack: true,
    fraud_prevention_ack: true,
  });

  // Conditional configs
  const [statutoryAuditConfig, setStatutoryAuditConfig] = useState({
    ifc_applicable: true,
    caro_applicable: true,
    ind_as_applicable: false,
  });

  const [taxAuditConfig, setTaxAuditConfig] = useState({
    tax_audit_form: '3CA' as const,
    audited_under_other_law: false,
    accounting_standard: 'AS' as const,
  });

  // Available letter types
  const availableLetterTypes = useMemo(() => EngagementLetterGenerator.getAvailableLetterTypes(), []);

  // Validation
  const requiredFields = useMemo(() => {
    return letterType ? EngagementLetterGenerator.getRequiredFieldsForType(letterType) : [];
  }, [letterType]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!letterType) errors.push('Please select an engagement letter type');
    if (!entity.entity_name.trim()) errors.push('Entity name is required');
    if (!entity.registration_no.trim()) errors.push('Registration number is required');
    if (!entity.email.trim()) errors.push('Email is required');
    if (!period.financial_year.trim()) errors.push('Financial year is required');
    if (!period.balance_sheet_date) errors.push('Balance sheet date is required');
    if (!auditor.firm_name.trim()) errors.push('Firm name is required');
    if (!auditor.partner_name.trim()) errors.push('Partner name is required');

    if (letterType.includes('tax_audit') && !period.assessment_year.trim()) {
      errors.push('Assessment year is required for tax audit letters');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Generate letter
  const handleGenerateLetter = async () => {
    if (!validateForm()) {
      toast.error(`${validationErrors.length} validation error(s) found`);
      return;
    }

    setGenerating(true);

    try {
      const masterData: EngagementLetterMasterData = {
        engagement_type: letterType as any,
        entity,
        period,
        auditor,
        commercial,
        mgmt_responsibilities,
        statutory_audit_config: letterType.includes('statutory') ? statutoryAuditConfig : undefined,
        tax_audit_config: letterType.includes('tax_audit') ? taxAuditConfig : undefined,
      };

      const result = await EngagementLetterGenerator.generateLetter(masterData);

      if (!result.success) {
        toast.error(result.error || 'Generation failed');
        return;
      }

      // Trigger download
      if (result.document_base64) {
        const buffer = Buffer.from(result.document_base64, 'base64');
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = EngagementLetterDocxGenerator.generateFilename(masterData);
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success('Engagement letter generated successfully!');
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Master-Driven Engagement Letter Generator</CardTitle>
          <CardDescription>
            Generate professional engagement letters from one master data input
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="selection">1. Select</TabsTrigger>
          <TabsTrigger value="entity">2. Entity</TabsTrigger>
          <TabsTrigger value="auditor">3. Auditor</TabsTrigger>
          <TabsTrigger value="commercial">4. Commercial</TabsTrigger>
          <TabsTrigger value="generate">5. Generate</TabsTrigger>
        </TabsList>

        {/* STEP 1: LETTER TYPE SELECTION */}
        <TabsContent value="selection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Engagement Letter Type</CardTitle>
              <CardDescription>Choose exactly one engagement letter category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableLetterTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      letterType === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setLetterType(type.id)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={type.id}
                        id={type.id}
                        checked={letterType === type.id}
                        onChange={() => setLetterType(type.id)}
                      />
                      <div>
                        <Label htmlFor={type.id} className="font-semibold cursor-pointer">
                          {type.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {letterType && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have selected: <strong>{availableLetterTypes.find((t) => t.id === letterType)?.label}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => letterType && setActiveTab('entity')} disabled={!letterType} className="w-full">
                Continue →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 2: ENTITY DETAILS */}
        <TabsContent value="entity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Name *</Label>
                  <Input
                    value={entity.entity_name}
                    onChange={(e) => setEntity({ ...entity, entity_name: e.target.value })}
                    placeholder="Company/Firm name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Registration No. (CIN/FRN) *</Label>
                  <Input
                    value={entity.registration_no}
                    onChange={(e) => setEntity({ ...entity, registration_no: e.target.value })}
                    placeholder="CIN or Firm Registration No."
                  />
                </div>

                <div className="space-y-2">
                  <Label>PAN *</Label>
                  <Input
                    value={entity.pan}
                    onChange={(e) => setEntity({ ...entity, pan: e.target.value })}
                    placeholder="Permanent Account Number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GSTIN (optional)</Label>
                  <Input
                    value={entity.gstin}
                    onChange={(e) => setEntity({ ...entity, gstin: e.target.value })}
                    placeholder="GSTIN"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Registered Address *</Label>
                  <Textarea
                    value={entity.registered_address}
                    onChange={(e) => setEntity({ ...entity, registered_address: e.target.value })}
                    placeholder="Full registered address"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={entity.email}
                    onChange={(e) => setEntity({ ...entity, email: e.target.value })}
                    placeholder="Contact email"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={entity.phone}
                    onChange={(e) => setEntity({ ...entity, phone: e.target.value })}
                    placeholder="Contact phone"
                  />
                </div>
              </div>

              <Button onClick={() => setActiveTab('auditor')} className="w-full">
                Continue →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 3: AUDITOR DETAILS */}
        <TabsContent value="auditor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auditor & Period Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Engagement Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Financial Year *</Label>
                    <Input
                      value={period.financial_year}
                      onChange={(e) => setPeriod({ ...period, financial_year: e.target.value })}
                      placeholder="2024-25"
                    />
                  </div>

                  {letterType?.includes('tax_audit') && (
                    <div className="space-y-2">
                      <Label>Assessment Year *</Label>
                      <Input
                        value={period.assessment_year}
                        onChange={(e) => setPeriod({ ...period, assessment_year: e.target.value })}
                        placeholder="2024-25"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Balance Sheet Date *</Label>
                    <Input
                      type="date"
                      value={period.balance_sheet_date}
                      onChange={(e) => setPeriod({ ...period, balance_sheet_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment Date *</Label>
                    <Input
                      type="date"
                      value={period.appointment_date}
                      onChange={(e) => setPeriod({ ...period, appointment_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Auditor Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Firm Name *</Label>
                    <Input
                      value={auditor.firm_name}
                      onChange={(e) => setAuditor({ ...auditor, firm_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Firm Registration No. *</Label>
                    <Input
                      value={auditor.firm_reg_no}
                      onChange={(e) => setAuditor({ ...auditor, firm_reg_no: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Name *</Label>
                    <Input
                      value={auditor.partner_name}
                      onChange={(e) => setAuditor({ ...auditor, partner_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Membership No. *</Label>
                    <Input
                      value={auditor.partner_mem_no}
                      onChange={(e) => setAuditor({ ...auditor, partner_mem_no: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner PAN</Label>
                    <Input
                      value={auditor.partner_pan}
                      onChange={(e) => setAuditor({ ...auditor, partner_pan: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Place *</Label>
                    <Input
                      value={auditor.place}
                      onChange={(e) => setAuditor({ ...auditor, place: e.target.value })}
                      placeholder="City/Place"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => setActiveTab('commercial')} className="w-full">
                Continue →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 4: COMMERCIAL & CONDITIONS */}
        <TabsContent value="commercial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Terms & Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Fees & Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Professional Fees (₹) *</Label>
                    <Input
                      type="number"
                      value={commercial.professional_fees}
                      onChange={(e) => setCommercial({ ...commercial, professional_fees: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 h-full pt-6">
                      <Checkbox
                        checked={commercial.taxes_extra}
                        onCheckedChange={(v) => setCommercial({ ...commercial, taxes_extra: !!v })}
                        id="taxes_extra"
                      />
                      <Label htmlFor="taxes_extra" className="font-normal cursor-pointer">
                        Fees exclusive of taxes
                      </Label>
                    </div>
                  </div>

                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Management Responsibilities</h3>
                <div className="space-y-3">
                  {[
                    { key: 'mgmt_responsibility_ack', label: 'Management acknowledges its responsibilities' },
                    { key: 'books_responsibility_ack', label: 'Responsibility for books of account' },
                    { key: 'internal_control_ack', label: 'Responsibility for internal controls' },
                    { key: 'fraud_prevention_ack', label: 'Responsibility for fraud prevention' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={(mgmt_responsibilities as any)[item.key]}
                        onCheckedChange={(v) =>
                          setMgmtResponsibilities({ ...mgmt_responsibilities, [item.key]: !!v })
                        }
                        id={item.key}
                      />
                      <Label htmlFor={item.key} className="font-normal cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONDITIONAL: STATUTORY AUDIT CONFIG */}
              {letterType?.includes('statutory') && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">Statutory Audit Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={statutoryAuditConfig.ifc_applicable}
                          onCheckedChange={(v) =>
                            setStatutoryAuditConfig({ ...statutoryAuditConfig, ifc_applicable: !!v })
                          }
                          id="ifc"
                        />
                        <Label htmlFor="ifc" className="font-normal cursor-pointer">
                          IFC (Internal Financial Controls) audit is applicable
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={statutoryAuditConfig.caro_applicable}
                          onCheckedChange={(v) =>
                            setStatutoryAuditConfig({ ...statutoryAuditConfig, caro_applicable: !!v })
                          }
                          id="caro"
                        />
                        <Label htmlFor="caro" className="font-normal cursor-pointer">
                          CARO 2020 applicable
                        </Label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* CONDITIONAL: TAX AUDIT CONFIG */}
              {letterType?.includes('tax_audit') && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">Tax Audit Configuration</h3>
                    <div className="space-y-4">
                      {letterType === 'tax_audit_partnership_3ca' && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={taxAuditConfig.audited_under_other_law}
                            onCheckedChange={(v) =>
                              setTaxAuditConfig({ ...taxAuditConfig, audited_under_other_law: !!v })
                            }
                            id="audited_other"
                          />
                          <Label htmlFor="audited_other" className="font-normal cursor-pointer">
                            Audited under other law
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Button onClick={() => setActiveTab('generate')} className="w-full">
                Continue to Generate →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 5: GENERATE */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review & Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationErrors.length > 0 && (
                <Alert className="border-red-500">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription>
                    <strong>Validation Errors:</strong>
                    <ul className="list-disc pl-5 mt-2">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <strong>Letter Type:</strong> {availableLetterTypes.find((t) => t.id === letterType)?.label}
                </div>
                <div>
                  <strong>Entity:</strong> {entity.entity_name || '[Not set]'}
                </div>
                <div>
                  <strong>Period:</strong> FY {period.financial_year}
                </div>
                <div>
                  <strong>Auditor:</strong> {auditor.firm_name || '[Not set]'}
                </div>
              </div>

              <Button
                onClick={handleGenerateLetter}
                disabled={generating || validationErrors.length > 0}
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Generate Engagement Letter (DOCX)
                  </>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                One master input generates one professional engagement letter ready for signing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

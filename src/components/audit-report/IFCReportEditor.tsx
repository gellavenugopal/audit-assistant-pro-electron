import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Save, Eye, Loader2, Plus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useIFCReportContent, MaterialWeakness, SignificantDeficiency } from '@/hooks/useIFCReportContent';
import { useAuditReportSetup } from '@/hooks/useAuditReportSetup';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { usePartners } from '@/hooks/usePartners';

interface IFCReportEditorProps {
  engagementId: string;
  clientName: string;
  financialYear: string;
}

export function IFCReportEditor({ engagementId, clientName, financialYear }: IFCReportEditorProps) {
  const { content, loading, saveContent, addMaterialWeakness, removeMaterialWeakness, addSignificantDeficiency, removeSignificantDeficiency } = useIFCReportContent(engagementId);
  const { setup } = useAuditReportSetup(engagementId);
  const { firmSettings } = useFirmSettings();
  const { getPartnerById } = usePartners();
  
  // Get signing partner details
  const signingPartner = setup?.signing_partner_id ? getPartnerById(setup.signing_partner_id) : null;
  
  const [previewMode, setPreviewMode] = useState(false);
  const [opinionType, setOpinionType] = useState('unmodified');
  const [opinionParagraph, setOpinionParagraph] = useState('');
  const [basisForOpinion, setBasisForOpinion] = useState('');
  const [managementResponsibility, setManagementResponsibility] = useState('');
  const [auditorResponsibility, setAuditorResponsibility] = useState('');
  const [ifcMeaning, setIfcMeaning] = useState('');
  const [inherentLimitations, setInherentLimitations] = useState('');
  const [saving, setSaving] = useState(false);

  // New weakness/deficiency form states
  const [newWeaknessTitle, setNewWeaknessTitle] = useState('');
  const [newWeaknessDescription, setNewWeaknessDescription] = useState('');
  const [newWeaknessImpact, setNewWeaknessImpact] = useState('');
  const [newWeaknessRecommendation, setNewWeaknessRecommendation] = useState('');

  const [newDeficiencyTitle, setNewDeficiencyTitle] = useState('');
  const [newDeficiencyDescription, setNewDeficiencyDescription] = useState('');
  const [newDeficiencyImpact, setNewDeficiencyImpact] = useState('');
  const [newDeficiencyRecommendation, setNewDeficiencyRecommendation] = useState('');

  useEffect(() => {
    if (content) {
      setOpinionType(content.opinion_type);
      setOpinionParagraph(content.opinion_paragraph || '');
      setBasisForOpinion(content.basis_for_opinion || '');
      setManagementResponsibility(content.management_responsibility_section || '');
      setAuditorResponsibility(content.auditor_responsibility_section || '');
      setIfcMeaning(content.ifc_meaning_section || '');
      setInherentLimitations(content.inherent_limitations_section || '');
    } else {
      // Set default text for new reports
      setManagementResponsibility(getDefaultManagementResponsibility());
      setAuditorResponsibility(getDefaultAuditorResponsibility());
      setIfcMeaning(getDefaultIFCMeaning());
      setInherentLimitations(getDefaultInherentLimitations());
      // Set default opinion paragraph for unmodified opinion
      if (opinionType === 'unmodified') {
        setOpinionParagraph(getDefaultUnmodifiedOpinion(clientName, financialYear));
      }
    }
  }, [content, clientName, financialYear]);

  // Update opinion paragraph when opinion type changes
  useEffect(() => {
    if (!content && opinionType === 'unmodified') {
      setOpinionParagraph(getDefaultUnmodifiedOpinion(clientName, financialYear));
    } else if (!content && opinionType !== 'unmodified') {
      setOpinionParagraph('');
    }
  }, [opinionType, clientName, financialYear, content]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveContent({
      opinion_type: opinionType,
      opinion_paragraph: opinionParagraph,
      basis_for_opinion: basisForOpinion,
      management_responsibility_section: managementResponsibility,
      auditor_responsibility_section: auditorResponsibility,
      ifc_meaning_section: ifcMeaning,
      inherent_limitations_section: inherentLimitations,
    });
    setSaving(false);
    if (success) {
      toast.success('IFC report saved successfully');
    }
  };

  const handleAddMaterialWeakness = async () => {
    if (!newWeaknessTitle || !newWeaknessDescription) {
      toast.error('Title and description are required');
      return;
    }

    const success = await addMaterialWeakness({
      title: newWeaknessTitle,
      description: newWeaknessDescription,
      impact: newWeaknessImpact,
      recommendation: newWeaknessRecommendation,
    });

    if (success) {
      setNewWeaknessTitle('');
      setNewWeaknessDescription('');
      setNewWeaknessImpact('');
      setNewWeaknessRecommendation('');
    }
  };

  const handleAddSignificantDeficiency = async () => {
    if (!newDeficiencyTitle || !newDeficiencyDescription) {
      toast.error('Title and description are required');
      return;
    }

    const success = await addSignificantDeficiency({
      title: newDeficiencyTitle,
      description: newDeficiencyDescription,
      impact: newDeficiencyImpact,
      recommendation: newDeficiencyRecommendation,
    });

    if (success) {
      setNewDeficiencyTitle('');
      setNewDeficiencyDescription('');
      setNewDeficiencyImpact('');
      setNewDeficiencyRecommendation('');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading IFC report...</p>
        </CardContent>
      </Card>
    );
  }

  if (previewMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>IFC Report Preview</CardTitle>
              <CardDescription>Preview of Internal Financial Control Report</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Back to Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh]">
            <div className="mx-auto max-w-3xl space-y-6 p-4">
              {/* Title */}
              <div className="text-center">
                <h2 className="text-lg font-bold">ANNEXURE B TO THE INDEPENDENT AUDITOR'S REPORT</h2>
                <p className="text-sm mt-2">(Referred to in paragraph 2 under 'Report on Other Legal and Regulatory Requirements' section of our report of even date)</p>
              </div>

              {/* Heading */}
              <div className="text-center mt-6">
                <h3 className="text-base font-semibold">Report on the Internal Financial Control with Reference to Standalone Financial Statements under Clause (i) of Sub-section 3 of Section 143 of the Companies Act, 2013</h3>
              </div>

              {/* Opinion */}
              <div className="space-y-2">
                <h4 className="font-semibold">Opinion</h4>
                <p className="text-sm whitespace-pre-wrap">{opinionParagraph || '[Opinion paragraph not yet entered]'}</p>
              </div>

              {/* Basis for Opinion */}
              {basisForOpinion && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Basis for Opinion</h4>
                  <p className="text-sm whitespace-pre-wrap">{basisForOpinion}</p>
                </div>
              )}

              {/* Management's Responsibility */}
              <div className="space-y-2">
                <h4 className="font-semibold">Management's Responsibility for Internal Financial Control with Reference to Standalone Financial Statements</h4>
                <p className="text-sm whitespace-pre-wrap">{managementResponsibility}</p>
              </div>

              {/* Auditor's Responsibility */}
              <div className="space-y-2">
                <h4 className="font-semibold">Auditor's Responsibility</h4>
                <p className="text-sm whitespace-pre-wrap">{auditorResponsibility}</p>
              </div>

              {/* Meaning of IFC */}
              <div className="space-y-2">
                <h4 className="font-semibold">Meaning of Internal Financial Control with Reference to Standalone Financial Statements</h4>
                <p className="text-sm whitespace-pre-wrap">{ifcMeaning}</p>
              </div>

              {/* Inherent Limitations */}
              <div className="space-y-2">
                <h4 className="font-semibold">Inherent Limitations of Internal Financial Control with Reference to Standalone Financial Statements</h4>
                <p className="text-sm whitespace-pre-wrap">{inherentLimitations}</p>
              </div>

              {/* Material Weaknesses */}
              {content?.has_material_weaknesses && content.material_weaknesses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Material Weaknesses</h4>
                  {content.material_weaknesses.map((weakness, idx) => (
                    <div key={weakness.id} className="ml-4 space-y-1">
                      <p className="text-sm font-medium">{idx + 1}. {weakness.title}</p>
                      <p className="text-sm ml-4">{weakness.description}</p>
                      {weakness.impact && <p className="text-sm ml-4"><strong>Impact:</strong> {weakness.impact}</p>}
                      {weakness.recommendation && <p className="text-sm ml-4"><strong>Recommendation:</strong> {weakness.recommendation}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Significant Deficiencies */}
              {content?.has_significant_deficiencies && content.significant_deficiencies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Significant Deficiencies</h4>
                  {content.significant_deficiencies.map((deficiency, idx) => (
                    <div key={deficiency.id} className="ml-4 space-y-1">
                      <p className="text-sm font-medium">{idx + 1}. {deficiency.title}</p>
                      <p className="text-sm ml-4">{deficiency.description}</p>

              {/* Signature Table */}
              <div className="pt-8 mt-8 border-t">
                <div className="text-right space-y-1 text-sm">
                  <p className="font-semibold">For {firmSettings?.firm_name || '[Firm Name]'}</p>
                  <p>Chartered Accountants</p>
                  <p>Firm's Registration No. {firmSettings?.firm_registration_no || '______'}</p>
                  <p className="pt-8">______________</p>
                  <p className="font-semibold">{signingPartner?.name || '[Partner / Proprietor]'}</p>
                  <p>Partner</p>
                  <p>Membership No. {signingPartner?.membership_number || '__________'}</p>
                  {setup?.udin && <p>UDIN: {setup.udin}</p>}
                  {!setup?.udin && <p>UDIN: </p>}
                  <p className="pt-4">Place: {setup?.report_city || ''}</p>
                  <p>Date: {setup?.report_date ? new Date(setup.report_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
                </div>
              </div>
                      {deficiency.impact && <p className="text-sm ml-4"><strong>Impact:</strong> {deficiency.impact}</p>}
                      {deficiency.recommendation && <p className="text-sm ml-4"><strong>Recommendation:</strong> {deficiency.recommendation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>IFC Report Editor</CardTitle>
            <CardDescription>
              Internal Financial Control Report for {clientName} - {financialYear}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="opinion" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="opinion">Opinion</TabsTrigger>
            <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>
            <TabsTrigger value="meaning">IFC Meaning</TabsTrigger>
            <TabsTrigger value="weaknesses">Material Weaknesses</TabsTrigger>
            <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
          </TabsList>

          <TabsContent value="opinion" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Opinion Type</Label>
                  <RadioGroup value={opinionType} onValueChange={setOpinionType}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="unmodified" id="unmodified" />
                      <Label htmlFor="unmodified" className="font-normal cursor-pointer">
                        Unmodified Opinion
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="qualified" id="qualified" />
                      <Label htmlFor="qualified" className="font-normal cursor-pointer">
                        Qualified Opinion
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="adverse" id="adverse" />
                      <Label htmlFor="adverse" className="font-normal cursor-pointer">
                        Adverse Opinion
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="disclaimer" id="disclaimer" />
                      <Label htmlFor="disclaimer" className="font-normal cursor-pointer">
                        Disclaimer of Opinion
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="opinion-paragraph">Opinion Paragraph</Label>
                  <Textarea
                    id="opinion-paragraph"
                    value={opinionParagraph}
                    onChange={(e) => setOpinionParagraph(e.target.value)}
                    placeholder="Enter the opinion paragraph for IFC report..."
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basis-opinion">Basis for Opinion</Label>
                  <Textarea
                    id="basis-opinion"
                    value={basisForOpinion}
                    onChange={(e) => setBasisForOpinion(e.target.value)}
                    placeholder="Enter the basis for opinion..."
                    rows={6}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="responsibilities" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="management-responsibility">
                    Management's Responsibility for Internal Financial Control with Reference to Financial Statements
                  </Label>
                  <Textarea
                    id="management-responsibility"
                    value={managementResponsibility}
                    onChange={(e) => setManagementResponsibility(e.target.value)}
                    rows={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auditor-responsibility">
                    Auditor's Responsibility
                  </Label>
                  <Textarea
                    id="auditor-responsibility"
                    value={auditorResponsibility}
                    onChange={(e) => setAuditorResponsibility(e.target.value)}
                    rows={10}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="meaning" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ifc-meaning">Meaning of Internal Financial Control with Reference to Financial Statements</Label>
                  <Textarea
                    id="ifc-meaning"
                    value={ifcMeaning}
                    onChange={(e) => setIfcMeaning(e.target.value)}
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inherent-limitations">Inherent Limitations</Label>
                  <Textarea
                    id="inherent-limitations"
                    value={inherentLimitations}
                    onChange={(e) => setInherentLimitations(e.target.value)}
                    rows={8}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="weaknesses" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Material Weaknesses</h3>
                    <p className="text-sm text-muted-foreground">
                      Document material weaknesses in internal financial control with reference to standalone financial statements
                    </p>
                  </div>
                </div>

                {/* Existing Material Weaknesses */}
                {content?.material_weaknesses && content.material_weaknesses.length > 0 && (
                  <div className="space-y-4">
                    {content.material_weaknesses.map((weakness) => (
                      <Card key={weakness.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                              <div>
                                <CardTitle className="text-base">{weakness.title}</CardTitle>
                                <CardDescription className="mt-2">
                                  {weakness.description}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMaterialWeakness(weakness.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        {(weakness.impact || weakness.recommendation) && (
                          <CardContent className="space-y-2 text-sm">
                            {weakness.impact && (
                              <div>
                                <strong>Impact:</strong> {weakness.impact}
                              </div>
                            )}
                            {weakness.recommendation && (
                              <div>
                                <strong>Recommendation:</strong> {weakness.recommendation}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add New Material Weakness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Material Weakness</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="weakness-title">Title *</Label>
                      <Input
                        id="weakness-title"
                        value={newWeaknessTitle}
                        onChange={(e) => setNewWeaknessTitle(e.target.value)}
                        placeholder="Brief title for the material weakness"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weakness-description">Description *</Label>
                      <Textarea
                        id="weakness-description"
                        value={newWeaknessDescription}
                        onChange={(e) => setNewWeaknessDescription(e.target.value)}
                        placeholder="Detailed description of the material weakness"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weakness-impact">Impact</Label>
                      <Textarea
                        id="weakness-impact"
                        value={newWeaknessImpact}
                        onChange={(e) => setNewWeaknessImpact(e.target.value)}
                        placeholder="Impact on financial reporting"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weakness-recommendation">Recommendation</Label>
                      <Textarea
                        id="weakness-recommendation"
                        value={newWeaknessRecommendation}
                        onChange={(e) => setNewWeaknessRecommendation(e.target.value)}
                        placeholder="Recommended corrective actions"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleAddMaterialWeakness} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Material Weakness
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="deficiencies" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Significant Deficiencies</h3>
                    <p className="text-sm text-muted-foreground">
                      Document significant deficiencies that are less severe than material weaknesses
                    </p>
                  </div>
                </div>

                {/* Existing Significant Deficiencies */}
                {content?.significant_deficiencies && content.significant_deficiencies.length > 0 && (
                  <div className="space-y-4">
                    {content.significant_deficiencies.map((deficiency) => (
                      <Card key={deficiency.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                              <div>
                                <CardTitle className="text-base">{deficiency.title}</CardTitle>
                                <CardDescription className="mt-2">
                                  {deficiency.description}
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSignificantDeficiency(deficiency.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        {(deficiency.impact || deficiency.recommendation) && (
                          <CardContent className="space-y-2 text-sm">
                            {deficiency.impact && (
                              <div>
                                <strong>Impact:</strong> {deficiency.impact}
                              </div>
                            )}
                            {deficiency.recommendation && (
                              <div>
                                <strong>Recommendation:</strong> {deficiency.recommendation}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Add New Significant Deficiency */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Significant Deficiency</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deficiency-title">Title *</Label>
                      <Input
                        id="deficiency-title"
                        value={newDeficiencyTitle}
                        onChange={(e) => setNewDeficiencyTitle(e.target.value)}
                        placeholder="Brief title for the significant deficiency"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deficiency-description">Description *</Label>
                      <Textarea
                        id="deficiency-description"
                        value={newDeficiencyDescription}
                        onChange={(e) => setNewDeficiencyDescription(e.target.value)}
                        placeholder="Detailed description of the significant deficiency"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deficiency-impact">Impact</Label>
                      <Textarea
                        id="deficiency-impact"
                        value={newDeficiencyImpact}
                        onChange={(e) => setNewDeficiencyImpact(e.target.value)}
                        placeholder="Impact on financial reporting"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deficiency-recommendation">Recommendation</Label>
                      <Textarea
                        id="deficiency-recommendation"
                        value={newDeficiencyRecommendation}
                        onChange={(e) => setNewDeficiencyRecommendation(e.target.value)}
                        placeholder="Recommended corrective actions"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleAddSignificantDeficiency} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Significant Deficiency
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Default text templates
function getDefaultUnmodifiedOpinion(clientName: string, financialYear: string): string {
  return `We have audited the internal financial controls with reference to standalone financial statements of ${clientName} ("the Company") as of ${financialYear} in conjunction with our audit of the standalone financial statements of the Company for the year ended on that date.

In our opinion, considering the nature of business, size of operation and organisation structure of the Company and according to the information and explanations given to us, the Company has, in all material respects, an adequate internal financial controls system with reference to standalone financial statements and such internal financial controls with reference to financial statements were operating effectively as at ${financialYear}, based on the internal control with reference to standalone financial statements criteria established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the Institute of Chartered Accountants of India.`;
}

function getDefaultManagementResponsibility(): string {
  return `The Company's Board of Directors is responsible for establishing and maintaining internal financial control with reference to standalone financial statements based on the internal control with reference to standalone financial statements criteria established by the Company considering the essential components of internal control stated in the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting issued by the Institute of Chartered Accountants of India. These responsibilities include the design, implementation and maintenance of adequate internal financial control with reference to standalone financial statements that were operating effectively for ensuring the orderly and efficient conduct of its business, including adherence to the Company's policies, the safeguarding of its assets, the prevention and detection of frauds and errors, the accuracy and completeness of the accounting records, and the timely preparation of reliable financial information, as required under the Companies Act, 2013.`;
}

function getDefaultAuditorResponsibility(): string {
  return `Our responsibility is to express an opinion on the Company's internal financial control with reference to standalone financial statements based on our audit. We conducted our audit in accordance with the Guidance Note on Audit of Internal Financial Controls Over Financial Reporting (the "Guidance Note") and the Standards on Auditing issued by ICAI and deemed to be prescribed under section 143(10) of the Companies Act, 2013, to the extent applicable to an audit of internal financial control with reference to standalone financial statements, both applicable to an audit of Internal Financial Controls and, both issued by the Institute of Chartered Accountants of India. Those Standards and the Guidance Note require that we comply with ethical requirements and plan and perform the audit to obtain reasonable assurance about whether adequate internal financial control with reference to standalone financial statements was established and maintained and if such controls operated effectively in all material respects.`;
}

function getDefaultIFCMeaning(): string {
  return `A company's internal financial control with reference to standalone financial statements is a process designed to provide reasonable assurance regarding the reliability of financial reporting and the preparation of financial statements for external purposes in accordance with generally accepted accounting principles. A company's internal financial control with reference to standalone financial statements includes those policies and procedures that (1) pertain to the maintenance of records that, in reasonable detail, accurately and fairly reflect the transactions and dispositions of the assets of the company; (2) provide reasonable assurance that transactions are recorded as necessary to permit preparation of financial statements in accordance with generally accepted accounting principles, and that receipts and expenditures of the company are being made only in accordance with authorisations of management and directors of the company; and (3) provide reasonable assurance regarding prevention or timely detection of unauthorised acquisition, use, or disposition of the company's assets that could have a material effect on the financial statements.`;
}

function getDefaultInherentLimitations(): string {
  return `Because of the inherent limitations of internal financial control with reference to standalone financial statements, including the possibility of collusion or improper management override of controls, material misstatements due to error or fraud may occur and not be detected. Also, projections of any evaluation of the internal financial control with reference to standalone financial statements to future periods are subject to the risk that the internal financial control with reference to standalone financial statements may become inadequate because of changes in conditions, or that the degree of compliance with the policies or procedures may deteriorate.`;
}

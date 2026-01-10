import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEngagement } from '@/contexts/EngagementContext';
import { usePartners } from '@/hooks/usePartners';

export interface EngagementLetterData {
  clientName: string;
  clientAddress: string;
  financialYear: string;
  engagementType: string;
  auditScope: string;
  engagementPeriod: string;
  auditFee: string;
  otherServices: string;
  partnerName: string;
  partnerMembership: string;
  engagementDate: string;
  notes: string;
}

export function EngagementLetterGenerator() {
  const navigate = useNavigate();
  const { currentEngagement } = useEngagement();
  const { partners } = usePartners();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<EngagementLetterData>({
    clientName: currentEngagement?.client_name || '',
    clientAddress: '',
    financialYear: currentEngagement?.financial_year || '',
    engagementType: 'Audit',
    auditScope: 'Complete audit in accordance with Standards on Auditing',
    engagementPeriod: '12 months',
    auditFee: '',
    otherServices: 'None',
    partnerName: partners.length > 0 ? partners[0].name : '',
    partnerMembership: partners.length > 0 ? partners[0].membership_number : '',
    engagementDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<EngagementLetterData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<EngagementLetterData> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    if (!formData.clientAddress.trim()) {
      newErrors.clientAddress = 'Client address is required';
    }
    if (!formData.financialYear.trim()) {
      newErrors.financialYear = 'Financial year is required';
    }
    if (!formData.auditFee.trim()) {
      newErrors.auditFee = 'Audit fee is required';
    }
    if (!formData.partnerName.trim()) {
      newErrors.partnerName = 'Partner name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EngagementLetterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveLetter = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Save engagement letter data to database
      console.log('Engagement Letter Data:', formData);
      
      toast.success('Engagement letter details saved successfully');
      navigate('/appointment');
    } catch (error) {
      console.error('Error saving engagement letter:', error);
      toast.error('Failed to save engagement letter details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/appointment');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointment
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Engagement Letter Generator</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage engagement letters for this engagement
          </p>
          {currentEngagement && (
            <p className="text-xs text-muted-foreground mt-2">
              Engagement: {currentEngagement.client_name} ({currentEngagement.financial_year})
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
              <CardDescription>Basic engagement details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientName" className="text-sm">
                  Client Name *
                </Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  className={errors.clientName ? 'border-red-500' : ''}
                />
                {errors.clientName && (
                  <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="clientAddress" className="text-sm">
                  Client Address *
                </Label>
                <Textarea
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                  placeholder="Enter client address"
                  rows={3}
                  className={errors.clientAddress ? 'border-red-500' : ''}
                />
                {errors.clientAddress && (
                  <p className="text-xs text-red-500 mt-1">{errors.clientAddress}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="financialYear" className="text-sm">
                    Financial Year *
                  </Label>
                  <Input
                    id="financialYear"
                    value={formData.financialYear}
                    onChange={(e) => handleInputChange('financialYear', e.target.value)}
                    placeholder="e.g., 2024-25"
                    className={errors.financialYear ? 'border-red-500' : ''}
                  />
                  {errors.financialYear && (
                    <p className="text-xs text-red-500 mt-1">{errors.financialYear}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="engagementDate" className="text-sm">
                    Engagement Date
                  </Label>
                  <Input
                    id="engagementDate"
                    type="date"
                    value={formData.engagementDate}
                    onChange={(e) => handleInputChange('engagementDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Details</CardTitle>
              <CardDescription>Scope and terms of engagement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="engagementType" className="text-sm">
                  Engagement Type
                </Label>
                <Input
                  id="engagementType"
                  value={formData.engagementType}
                  onChange={(e) => handleInputChange('engagementType', e.target.value)}
                  placeholder="e.g., Audit"
                />
              </div>

              <div>
                <Label htmlFor="auditScope" className="text-sm">
                  Audit Scope
                </Label>
                <Textarea
                  id="auditScope"
                  value={formData.auditScope}
                  onChange={(e) => handleInputChange('auditScope', e.target.value)}
                  placeholder="Enter audit scope"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="engagementPeriod" className="text-sm">
                  Engagement Period
                </Label>
                <Input
                  id="engagementPeriod"
                  value={formData.engagementPeriod}
                  onChange={(e) => handleInputChange('engagementPeriod', e.target.value)}
                  placeholder="e.g., 12 months"
                />
              </div>
            </CardContent>
          </Card>

          {/* Fees Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fees</CardTitle>
              <CardDescription>Audit and other service fees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="auditFee" className="text-sm">
                  Audit Fee (₹) *
                </Label>
                <Input
                  id="auditFee"
                  type="number"
                  value={formData.auditFee}
                  onChange={(e) => handleInputChange('auditFee', e.target.value)}
                  placeholder="Enter audit fee"
                  className={errors.auditFee ? 'border-red-500' : ''}
                />
                {errors.auditFee && (
                  <p className="text-xs text-red-500 mt-1">{errors.auditFee}</p>
                )}
              </div>

              <div>
                <Label htmlFor="otherServices" className="text-sm">
                  Other Services
                </Label>
                <Textarea
                  id="otherServices"
                  value={formData.otherServices}
                  onChange={(e) => handleInputChange('otherServices', e.target.value)}
                  placeholder="Enter other services (if any)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Partner Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partner Information</CardTitle>
              <CardDescription>Signing partner details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="partnerName" className="text-sm">
                  Partner Name *
                </Label>
                <Input
                  id="partnerName"
                  value={formData.partnerName}
                  onChange={(e) => handleInputChange('partnerName', e.target.value)}
                  placeholder="Enter partner name"
                  className={errors.partnerName ? 'border-red-500' : ''}
                />
                {errors.partnerName && (
                  <p className="text-xs text-red-500 mt-1">{errors.partnerName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="partnerMembership" className="text-sm">
                  Membership Number
                </Label>
                <Input
                  id="partnerMembership"
                  value={formData.partnerMembership}
                  onChange={(e) => handleInputChange('partnerMembership', e.target.value)}
                  placeholder="Enter membership number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
              <CardDescription>Optional special terms or conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any additional notes or special terms"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium truncate">{formData.clientName || '-'}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-muted-foreground">Financial Year</p>
                  <p className="font-medium">{formData.financialYear || '-'}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground">Engagement Type</p>
                  <p className="font-medium">{formData.engagementType || '-'}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground">Audit Fee</p>
                  <p className="font-medium">₹{formData.auditFee ? parseInt(formData.auditFee).toLocaleString('en-IN') : '-'}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground">Partner</p>
                  <p className="font-medium truncate">{formData.partnerName || '-'}</p>
                </div>
              </div>

              {/* Info Alert */}
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Fill in all required fields (marked with *) to save the engagement letter details.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  onClick={handleSaveLetter} 
                  disabled={submitting}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'Saving...' : 'Save Details'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

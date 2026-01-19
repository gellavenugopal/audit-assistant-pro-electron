import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEngagement } from '@/contexts/EngagementContext';
import { usePartners } from '@/hooks/usePartners';

interface EngagementLetterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface EngagementLetterData {
  // Client Information
  clientName: string;
  clientAddress: string;
  financialYear: string;
  
  // Engagement Details
  engagementType: string;
  auditScope: string;
  engagementPeriod: string;
  
  // Fees
  auditFee: string;
  otherServices: string;
  
  // Partner Information
  partnerName: string;
  partnerMembership: string;
  
  // Additional
  engagementDate: string;
  notes: string;
}

export function EngagementLetterModal({ open, onOpenChange }: EngagementLetterModalProps) {
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
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleGenerateLetter = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Save engagement letter data to database
      console.log('Engagement Letter Data:', formData);
      
      toast.success('Engagement letter details saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving engagement letter:', error);
      toast.error('Failed to save engagement letter details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Engagement Letter</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a customized engagement letter. Required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Information Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Client Information</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          {/* Engagement Details Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Engagement Details</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          {/* Fees Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Fees</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          {/* Partner Information Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Partner Information</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          <Separator />

          {/* Additional Notes Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Additional Notes</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes or special terms"
              rows={3}
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Fill in the engagement details below. This information will be stored for the current engagement.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerateLetter} disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Details
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

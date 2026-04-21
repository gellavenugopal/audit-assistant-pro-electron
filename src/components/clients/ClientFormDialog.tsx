import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES } from '@/data/indianStates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CONSTITUTION_TYPES } from '@/data/constitutionTypes';

export interface ClientFormData {
  id?: string;
  name: string;
  industry: string;
  constitution: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  pan: string;
  cin: string;
  state: string;
  pin: string;
  notes: string;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientFormData | null;
  onSuccess: () => void;
}

const emptyForm: ClientFormData = {
  name: '',
  industry: '',
  constitution: 'company',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  pan: '',
  cin: '',
  state: '',
  pin: '',
  notes: '',
};

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientFormData>(emptyForm);

  const isEditing = !!client?.id;

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({
          id: client.id,
          name: client.name || '',
          industry: client.industry || '',
          constitution: client.constitution || 'company',
          contact_person: client.contact_person || '',
          contact_email: client.contact_email || '',
          contact_phone: client.contact_phone || '',
          address: client.address || '',
          pan: client.pan || '',
          cin: client.cin || '',
          state: client.state || '',
          pin: client.pin || '',
          notes: client.notes || '',
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, client]);

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return false;
    }
    // Optional PAN validation (basic format: 5 letters, 4 digits, 1 letter)
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) {
      toast.error('PAN format should be like ABCDE1234F');
      return false;
    }
    // Optional PIN validation (6 digits)
    if (form.pin && !/^\d{6}$/.test(form.pin)) {
      toast.error('PIN should be 6 digits');
      return false;
    }
    // Optional email validation
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const clientData = {
        name: form.name.trim(),
        industry: form.industry.trim() || null,
        constitution: form.constitution || 'company',
        contact_person: form.contact_person.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        address: form.address.trim() || null,
        pan: form.pan.trim() || null,
        cin: form.cin.trim() || null,
        state: form.state || null,
        pin: form.pin.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isEditing && form.id) {
        const { error } = await db
          .from('clients')
          .eq('id', form.id)
          .update(clientData)
          .execute();

        if (error) throw error;
        if (client?.name && client.name !== clientData.name) {
          const { error: engagementError } = await db
            .from('engagements')
            .eq('client_id', form.id)
            .update({ client_name: clientData.name })
            .execute();
          if (engagementError) {
            console.warn('Failed to sync engagement client name', engagementError);
          }
        }
        toast.success('Client updated');
      } else {
        const { error } = await db
          .from('clients')
          .insert({
            ...clientData,
            created_by: user?.id,
          })
          .execute();

        if (error) throw error;
        toast.success('Client created');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>Enter client details below</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ABC Corporation Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="Manufacturing"
              />
            </div>
            <div className="space-y-2">
              <Label>Constitution *</Label>
              <Select
                value={form.constitution}
                onValueChange={(value) => setForm((f) => ({ ...f, constitution: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select constitution" />
                </SelectTrigger>
                <SelectContent>
                  {CONSTITUTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                placeholder="john@abc.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Business Park, Mumbai"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input
                  value={form.pan}
                  onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>CIN</Label>
                <Input
                  value={form.cin}
                  onChange={(e) => setForm((f) => ({ ...f, cin: e.target.value.toUpperCase() }))}
                  placeholder="U12345MH2020PLC123456"
                  maxLength={21}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={form.state}
                  onValueChange={(value) => setForm((f) => ({ ...f, state: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state.gstCode} value={state.name}>
                        {state.name} ({state.gstCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PIN</Label>
                <Input
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes about this client..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Update' : 'Add'} Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

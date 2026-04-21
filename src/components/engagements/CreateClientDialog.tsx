import { useState } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { CONSTITUTION_TYPES } from '@/data/constitutionTypes';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientName: string, clientId: string) => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
}: CreateClientDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
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
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!form.industry.trim()) {
      toast.error('Industry is required');
      return;
    }

    setSaving(true);
    try {
      const { data: inserted, error } = await db
        .from('clients')
        .insert({
          name: form.name,
          industry: form.industry,
          constitution: form.constitution || 'company',
          contact_person: form.contact_person || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          pan: form.pan || null,
          cin: form.cin || null,
          state: form.state || null,
          pin: form.pin || null,
          created_by: user?.id,
        })
        .execute();

      if (error) throw error;

      const newClient = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!newClient) {
        throw new Error('Failed to create client (no data returned)');
      }

      toast.success('Client created');
      onClientCreated(newClient.name, newClient.id);
      setForm({ name: '', industry: '', constitution: 'company', contact_person: '', contact_email: '', contact_phone: '', address: '', pan: '', cin: '', state: '', pin: '' });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
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
              <Label>Industry *</Label>
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
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Business Park, Mumbai"
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
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                  placeholder="400001"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

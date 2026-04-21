import { useState, useEffect, useMemo } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';
import { useAuth } from '@/contexts/AuthContext';

const db = getSQLiteClient();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  UserCheck,
  Plus,
  Pencil,
  Link2,
  Link2Off,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PartnerUser {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

interface PartnerRecord {
  id: string;
  user_id: string | null;
  name: string;
  membership_number: string;
  date_of_joining: string;
  date_of_exit: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface LinkedPartner extends PartnerUser {
  complianceRecord: PartnerRecord | null;
  matchType: 'user_id' | 'email' | 'none';
}

interface ComplianceForm {
  membership_number: string;
  date_of_joining: string;
  date_of_exit: string;
  pan: string;
  phone: string;
}

export function PartnersTabContent() {
  const { user, profile } = useAuth();

  // Data states
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [partnerRecords, setPartnerRecords] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<LinkedPartner | null>(null);
  const [complianceForm, setComplianceForm] = useState<ComplianceForm>({
    membership_number: '',
    date_of_joining: '',
    date_of_exit: '',
    pan: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  // Unlinked records section
  const [unlinkedOpen, setUnlinkedOpen] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch partner users (profiles + user_roles where role='partner')
      const { data: rolesData, error: rolesError } = await db
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner')
        .execute();

      if (rolesError) throw rolesError;

      const partnerUserIds = rolesData?.map(r => r.user_id) || [];

      if (partnerUserIds.length > 0) {
        // Fetch all profiles and filter in JavaScript (SQLite client doesn't support .in())
        const { data: allProfilesData, error: profilesError } = await db
          .from('profiles')
          .select('user_id, full_name, email, is_active')
          .execute();

        if (profilesError) throw profilesError;

        // Filter to only the profiles we need
        const profilesData = (allProfilesData || []).filter(p => partnerUserIds.includes(p.user_id));
        setPartnerUsers(profilesData || []);
      } else {
        setPartnerUsers([]);
      }

      // Fetch partner records
      const { data: partnersData, error: partnersError } = await db
        .from('partners')
        .select('*')
        .order('name', { ascending: true })
        .execute();

      if (partnersError) throw partnersError;
      setPartnerRecords(partnersData || []);
    } catch (error) {
      console.error('Error fetching partner data:', error);
      toast.error('Failed to load partner data');
    } finally {
      setLoading(false);
    }
  };

  // Compute linked partners (primary list based on partner users)
  const linkedPartners = useMemo<LinkedPartner[]>(() => {
    return partnerUsers.map(pu => {
      // First try to match by user_id
      let record = partnerRecords.find(pr => pr.user_id === pu.user_id);
      if (record) {
        return { ...pu, complianceRecord: record, matchType: 'user_id' as const };
      }

      // Then try by email match
      record = partnerRecords.find(pr =>
        pr.user_id === null &&
        pr.email?.toLowerCase() === pu.email.toLowerCase()
      );
      if (record) {
        return { ...pu, complianceRecord: record, matchType: 'email' as const };
      }

      return { ...pu, complianceRecord: null, matchType: 'none' as const };
    });
  }, [partnerUsers, partnerRecords]);

  // Compute truly unlinked records (no matching user)
  const unlinkedRecords = useMemo(() => {
    const linkedRecordIds = new Set(
      linkedPartners
        .filter(lp => lp.complianceRecord)
        .map(lp => lp.complianceRecord!.id)
    );
    return partnerRecords.filter(pr => !linkedRecordIds.has(pr.id));
  }, [linkedPartners, partnerRecords]);

  const handleOpenComplianceDialog = (partner: LinkedPartner) => {
    setSelectedPartner(partner);
    if (partner.complianceRecord) {
      setComplianceForm({
        membership_number: partner.complianceRecord.membership_number || '',
        date_of_joining: partner.complianceRecord.date_of_joining || '',
        date_of_exit: partner.complianceRecord.date_of_exit || '',
        pan: partner.complianceRecord.pan || '',
        phone: partner.complianceRecord.phone || '',
      });
    } else {
      setComplianceForm({
        membership_number: '',
        date_of_joining: '',
        date_of_exit: '',
        pan: '',
        phone: '',
      });
    }
    setComplianceDialogOpen(true);
  };

  const handleSaveCompliance = async () => {
    if (!selectedPartner) return;

    if (!complianceForm.membership_number.trim()) {
      toast.error('Membership number is required');
      return;
    }
    if (!complianceForm.date_of_joining) {
      toast.error('Date of joining is required');
      return;
    }

    setSaving(true);
    try {
      const complianceData = {
        membership_number: complianceForm.membership_number.trim(),
        date_of_joining: complianceForm.date_of_joining,
        date_of_exit: complianceForm.date_of_exit || null,
        pan: complianceForm.pan?.trim() || null,
        phone: complianceForm.phone?.trim() || null,
      };

      if (selectedPartner.complianceRecord) {
        // Update existing record
        const { error } = await db
          .from('partners')
          .update(complianceData)
          .eq('id', selectedPartner.complianceRecord.id)
          .execute();

        if (error) throw error;
        toast.success('Compliance details updated');
      } else {
        // Create new record linked to user
        const { error } = await db
          .from('partners')
          .insert({
            ...complianceData,
            user_id: selectedPartner.user_id,
            name: selectedPartner.full_name,
            email: selectedPartner.email,
            created_by: user?.id,
          })
          .execute();

        if (error) throw error;
        toast.success('Compliance record created');
      }

      setComplianceDialogOpen(false);
      setSelectedPartner(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save compliance details');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkRecord = async (partner: LinkedPartner) => {
    if (!partner.complianceRecord || partner.matchType !== 'email') return;

    setLinking(partner.complianceRecord.id);
    try {
      const { error } = await db
        .from('partners')
        .update({ user_id: partner.user_id })
        .eq('id', partner.complianceRecord.id)
        .execute();

      if (error) throw error;
      toast.success('Record linked to user');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link record');
    } finally {
      setLinking(null);
    }
  };

  const handleUnlinkRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to unlink this compliance record from the user?')) return;

    setLinking(recordId);
    try {
      const { error } = await db
        .from('partners')
        .update({ user_id: null })
        .eq('id', recordId)
        .execute();

      if (error) throw error;
      toast.success('Record unlinked');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink record');
    } finally {
      setLinking(null);
    }
  };

  const handleInvitePartner = async (record: PartnerRecord) => {
    if (!record.email) {
      toast.error('No email address for this partner');
      return;
    }

    setInviting(record.id);
    try {
      // Edge functions not available in SQLite
      toast.warning('Email invitation feature not yet implemented in SQLite.');
      const error = new Error('Email invitations require edge functions');
      // const { error } = await db.functions.invoke('send-invite', {
      //   body: {
      //     email: record.email,
      //     role: 'partner',
      //     full_name: record.name,
      //     phone: record.phone || undefined,
      //     inviterName: profile?.full_name || 'Admin',
      //     appUrl: window.location.origin,
      //   },
      // });

      if (error) throw error;
      toast.success(`Invitation sent to ${record.email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Users & Compliance</CardTitle>
        <CardDescription>
          Manage partner compliance details (ICAI membership, DOJ, etc.) for users with the partner role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary list: Partner Users */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Membership No</TableHead>
              <TableHead>Date of Joining</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
              ))
            ) : linkedPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <UserCheck className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No users with partner role found</p>
                    <p className="text-sm text-muted-foreground">
                      Assign the "partner" role to team members in the Roles tab
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              linkedPartners.map(partner => {
                const cr = partner.complianceRecord;
                const cleanPhone = cr?.phone?.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');

                return (
                  <TableRow key={partner.user_id}>
                    <TableCell className="font-medium">{partner.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{partner.email}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={`mailto:${partner.email}`} title="Send Email">
                            <Mail className="h-4 w-4 text-blue-500" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                        {partner.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cr?.membership_number || (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cr?.date_of_joining
                        ? format(new Date(cr.date_of_joining), 'dd MMM yyyy')
                        : <span className="text-muted-foreground text-sm">Not set</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{cr?.phone || '—'}</span>
                        {cleanPhone && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" title="Open WhatsApp">
                              <MessageCircle className="h-4 w-4 text-green-500" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenComplianceDialog(partner)}
                          title={cr ? 'Edit compliance' : 'Add compliance record'}
                        >
                          {cr ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>

                        {/* Show link button if email match found but not linked */}
                        {partner.matchType === 'email' && cr && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => handleLinkRecord(partner)}
                            disabled={linking === cr.id}
                            title="Link this compliance record to user"
                          >
                            {linking === cr.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Show unlink button if linked by user_id */}
                        {partner.matchType === 'user_id' && cr && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600"
                            onClick={() => handleUnlinkRecord(cr.id)}
                            disabled={linking === cr.id}
                            title="Unlink compliance record"
                          >
                            {linking === cr.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Link2Off className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Unlinked records section */}
        {unlinkedRecords.length > 0 && (
          <Collapsible open={unlinkedOpen} onOpenChange={setUnlinkedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  {unlinkedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Unlinked Partner Records ({unlinkedRecords.length})
                </span>
                <Badge variant="outline" className="text-amber-600">Legacy</Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    These partner records don't have a matching user account. You can invite them or link to an existing partner user.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Membership No</TableHead>
                        <TableHead>Date of Joining</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unlinkedRecords.map(record => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell className="text-muted-foreground">{record.email || '—'}</TableCell>
                          <TableCell>{record.membership_number}</TableCell>
                          <TableCell>
                            {record.date_of_joining
                              ? format(new Date(record.date_of_joining), 'dd MMM yyyy')
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {record.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600"
                                  onClick={() => handleInvitePartner(record)}
                                  disabled={inviting === record.id}
                                  title="Send invitation email"
                                >
                                  {inviting === record.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Compliance dialog */}
        <Dialog open={complianceDialogOpen} onOpenChange={setComplianceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPartner?.complianceRecord ? 'Edit' : 'Add'} Partner Compliance
              </DialogTitle>
              <DialogDescription>
                ICAI compliance details for {selectedPartner?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Membership Number *</Label>
                <Input
                  value={complianceForm.membership_number}
                  onChange={(e) => setComplianceForm(f => ({ ...f, membership_number: e.target.value }))}
                  placeholder="123456"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Joining *</Label>
                  <Input
                    type="date"
                    value={complianceForm.date_of_joining}
                    onChange={(e) => setComplianceForm(f => ({ ...f, date_of_joining: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Exit</Label>
                  <Input
                    type="date"
                    value={complianceForm.date_of_exit}
                    onChange={(e) => setComplianceForm(f => ({ ...f, date_of_exit: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input
                    value={complianceForm.pan}
                    onChange={(e) => setComplianceForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={complianceForm.phone}
                    onChange={(e) => setComplianceForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setComplianceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCompliance} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {selectedPartner?.complianceRecord ? 'Update' : 'Create'} Compliance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

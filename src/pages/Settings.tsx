import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, Shield, Bell, Crown, UserCog, Mail, Loader2, CheckCircle2, Save } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useFirmSettings } from '@/hooks/useFirmSettings';
import { useAuth } from '@/contexts/AuthContext';
import EmailVerificationStatus from '@/components/auth/EmailVerificationStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  partner: 'Partner',
  manager: 'Manager',
  senior: 'Senior',
  staff: 'Staff',
  viewer: 'Viewer',
};

const roleColors: Record<AppRole, string> = {
  partner: 'bg-amber-500/20 text-amber-600',
  manager: 'bg-blue-500/20 text-blue-600',
  senior: 'bg-purple-500/20 text-purple-600',
  staff: 'bg-green-500/20 text-green-600',
  viewer: 'bg-muted text-muted-foreground',
};

export default function Settings() {
  const { user, role } = useAuth();
  const { members, loading, canManageRoles, updateRole } = useTeamMembers();
  const { firmSettings, loading: firmLoading, saveFirmSettings } = useFirmSettings();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [savingFirm, setSavingFirm] = useState(false);

  // Firm form state
  const [firmForm, setFirmForm] = useState({
    firm_name: '',
    firm_registration_no: '',
    constitution: '',
    no_of_partners: 0,
  });

  // Load firm settings into form
  useEffect(() => {
    if (firmSettings) {
      setFirmForm({
        firm_name: firmSettings.firm_name || '',
        firm_registration_no: firmSettings.firm_registration_no || '',
        constitution: firmSettings.constitution || '',
        no_of_partners: firmSettings.no_of_partners || 0,
      });
    }
  }, [firmSettings]);

  const handleSaveFirmSettings = async () => {
    setSavingFirm(true);
    await saveFirmSettings(firmForm);
    setSavingFirm(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    await updateRole(userId, newRole);
    setEditingUser(null);
  };

  const handleAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setIsSendingReset(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Password reset link sent to ${resetEmail}`);
      setResetEmail('');
    }
  };

  const isAdmin = role === 'partner' || role === 'manager';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage firm and application settings</p>
      </div>

      <Tabs defaultValue="firm" className="space-y-6">
        <TabsList>
          <TabsTrigger value="firm" className="gap-2">
            <Building2 className="h-4 w-4" />
            Firm
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="firm" className="space-y-6">
          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Firm Information</h2>
            {firmLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Firm Name *</Label>
                    <Input 
                      value={firmForm.firm_name}
                      onChange={(e) => setFirmForm(prev => ({ ...prev, firm_name: e.target.value }))}
                      placeholder="Enter firm name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firm Registration Number (FRN)</Label>
                    <Input 
                      value={firmForm.firm_registration_no}
                      onChange={(e) => setFirmForm(prev => ({ ...prev, firm_registration_no: e.target.value }))}
                      placeholder="E.g., 123456N"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Constitution</Label>
                    <Select 
                      value={firmForm.constitution} 
                      onValueChange={(v) => setFirmForm(prev => ({ ...prev, constitution: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select constitution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="LLP">LLP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Partners</Label>
                    <Input 
                      type="number"
                      value={firmForm.no_of_partners}
                      onChange={(e) => setFirmForm(prev => ({ ...prev, no_of_partners: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  These details will appear on generated audit reports. Configure partners in the Admin Settings.
                </p>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveFirmSettings} disabled={savingFirm} className="gap-2">
                    {savingFirm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingFirm ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Branding</h2>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Firm Logo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Used in reports and exported documents
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload Logo
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="audit-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">Team Members</h2>
                {canManageRoles && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <UserCog className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No team members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const isEditing = editingUser === member.user_id;

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {member.full_name}
                            </p>
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
                            {member.role === 'partner' && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {canManageRoles && !isCurrentUser ? (
                          isEditing ? (
                            <Select
                              defaultValue={member.role}
                              onValueChange={(value) => handleRoleChange(member.user_id, value as AppRole)}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {roleLabels[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <>
                              <span
                                className={`text-xs px-2 py-1 rounded ${roleColors[member.role]}`}
                              >
                                {roleLabels[member.role]}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(member.user_id)}
                              >
                                Edit
                              </Button>
                            </>
                          )
                        ) : (
                          <span
                            className={`text-xs px-2 py-1 rounded ${roleColors[member.role]}`}
                          >
                            {roleLabels[member.role]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canManageRoles && (
              <div className="mt-4 p-3 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                <p className="text-sm text-muted-foreground">
                  New users are automatically assigned the <strong>Staff</strong> role when they sign up.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Email Verification</h2>
            <EmailVerificationStatus />
          </div>

          {isAdmin && (
            <div className="audit-card">
              <h2 className="font-semibold text-foreground mb-4">Admin Password Reset</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Send a password reset link to any team member's email address.
              </p>
              <form onSubmit={handleAdminPasswordReset} className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter user's email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSendingReset}>
                  {isSendingReset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Security Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Require 2FA for all users
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Session Timeout</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically log out inactive users
                  </p>
                </div>
                <Input className="w-24" type="number" defaultValue="30" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Password Expiry</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Force password change every X days
                  </p>
                </div>
                <Input className="w-24" type="number" defaultValue="90" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">IP Whitelisting</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Restrict access to specific IP addresses
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Data Encryption</h2>
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    AES-256 Encryption Active
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All data is encrypted at rest and in transit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="audit-card">
            <h2 className="font-semibold text-foreground mb-4">Email Notifications</h2>
            <div className="space-y-4">
              {[
                {
                  title: 'Review Notes',
                  description: 'When a new review note is raised',
                },
                {
                  title: 'Note Responses',
                  description: 'When someone responds to your notes',
                },
                {
                  title: 'Procedure Completion',
                  description: 'When assigned procedures are completed',
                },
                {
                  title: 'Sign-off Requests',
                  description: 'When approval is needed',
                },
                {
                  title: 'File Lock Events',
                  description: 'When files are locked or unlocked',
                },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <Switch defaultChecked={index < 3} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

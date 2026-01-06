import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Download, Settings, CheckCircle, XCircle, AlertCircle, Building, Mail, Phone, UserCircle, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGstzenCustomer } from "@/hooks/useGstzenCustomer";
import { useGstins } from "@/hooks/useGstins";
import { AddGstinDialog } from "@/components/gstin/AddGstinDialog";
import { GstinCredentialsDialog } from "@/components/gstin/GstinCredentialsDialog";
import { Gstr1DownloadDialog } from "@/components/gstr1/Gstr1DownloadDialog";
import { GstnLoginDialog } from "@/components/gstin/GstnLoginDialog";
import { ConsolidatedReportDialog } from "@/components/gstin/ConsolidatedReportDialog";
import { useQueryClient } from "@tanstack/react-query";
import { gstzenKeys } from "@/hooks/useGstzenCustomer";
import type { Gstin } from "@/types/gstzen";

type DialogType = "none" | "add-gstin" | "credentials" | "download" | "login" | "consolidated";


export default function GstzenIntegration() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedGstin, setSelectedGstin] = useState<Gstin | null>(null);
    const [activeDialog, setActiveDialog] = useState<DialogType>("none");

    // Check if user is authenticated with GSTZen
    const gstzenToken = localStorage.getItem('gstzen_token');
    const isGstzenAuthenticated = !!gstzenToken;

    // Get or create customer profile
    const { customer, isLoading: customerLoading } = useGstzenCustomer(user?.email || null);

    // Get GSTINs for this customer
    const { data: gstins = [], isLoading: gstinsLoading } = useGstins(customer?.uuid || null);

    const isLoading = customerLoading || gstinsLoading;

    const [activeSessions, setActiveSessions] = useState<Record<string, boolean>>({});

    const getStatusBadge = (gstin: Gstin) => {
        const hasCredentials = gstin.metadata?.gstn?.credentials?.username;
        const hasSession = gstin.metadata?.gstn?.session?.authtoken || activeSessions[gstin.uuid];

        if (hasSession) {
            return (
                <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                </Badge>
            );
        } else if (hasCredentials) {
            return (
                <Badge variant="secondary">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Credentials Saved
                </Badge>
            );
        } else {
            return (
                <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Configured
                </Badge>
            );
        }
    };

    const handleOpenAddGstin = () => {
        setActiveDialog("add-gstin");
    };

    const handleOpenCredentials = (gstin: Gstin) => {
        setSelectedGstin(gstin);
        setActiveDialog("credentials");
    };

    const handleOpenDownload = (gstin: Gstin) => {
        setSelectedGstin(gstin);
        setActiveDialog("download");
    };

    const handleOpenLogin = (gstin: Gstin) => {
        setSelectedGstin(gstin);
        setActiveDialog("login");
    };

    const handleOpenConsolidated = (gstin: Gstin) => {
        setSelectedGstin(gstin);
        setActiveDialog("consolidated");
    };

    const handleCloseDialog = () => {
        setActiveDialog("none");
        setSelectedGstin(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">GSTR1 Integration</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your GSTINs and download GSTR1 reports from the GST portal
                    </p>
                </div>
            </div>

            {/* Login Required Notice */}
            {!isGstzenAuthenticated && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                    GSTZen Authentication Required
                                </h3>
                                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                                    To access GSTR1 reports and manage GSTINs, you need to sign in to your GSTZen account.
                                </p>
                                <Button onClick={() => window.location.href = '/gstzen-login'}>
                                    Sign in to GSTZen
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Customer Profile Section */}
            {isGstzenAuthenticated && (
                <>
                    <div className="grid gap-6 md:grid-cols-2 mb-8">
                        {/* Customer Profile Card */}
                        <Card className="md:col-span-2 overflow-hidden">
                            <div className="bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                                <div className="h-20 w-20 rounded-full bg-background shadow-sm flex items-center justify-center shrink-0">
                                    <UserCircle className="h-10 w-10 text-primary" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">
                                            {customer ? `${customer.first_name} ${customer.last_name}` : 'Loading Profile...'}
                                        </h2>
                                        {customer?.organization && (
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                                                <Building className="h-4 w-4" />
                                                <span className="font-medium">{customer.organization}</span>
                                            </div>
                                        )}
                                    </div>
                                    {customer && (
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground pt-2">
                                            <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-full shadow-sm border">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span>{customer.email}</span>
                                            </div>
                                            {customer.phone && (
                                                <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-full shadow-sm border">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    <span>{customer.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isLoading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>}
                            </div>
                        </Card>
                    </div>

                    {/* GSTINs Management Section */}
                    <div className="space-y-6">
                        <div className="section-header">
                            <div>
                                <h2 className="section-title">Registered GSTINs</h2>
                                <p className="text-muted-foreground">Manage your GST identification numbers</p>
                            </div>
                            <Button onClick={handleOpenAddGstin} disabled={!customer} className="shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add GSTIN
                            </Button>
                        </div>

                        {gstinsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i} className="h-48 animate-pulse bg-muted/50" />
                                ))}
                            </div>
                        ) : gstins.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {gstins.map((gstin) => (
                                    <Card key={gstin.uuid} className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/40 hover:border-l-primary flex flex-col">
                                        <CardHeader className="pb-3 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <Badge variant="outline" className="font-mono text-base px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                                                    {gstin.gstin}
                                                </Badge>
                                                {getStatusBadge(gstin)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg line-clamp-1" title={gstin.trade_name || gstin.legal_name}>
                                                    {gstin.trade_name || gstin.legal_name || 'Unknown Entity'}
                                                </h3>
                                                <p className="text-sm text-muted-foreground capitalize flex items-center gap-2 mt-1">
                                                    {gstin.state || 'Unknown State'}
                                                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                                                    {gstin.filing_frequency === 'quarterly' ? 'Quarterly' : 'Monthly'}
                                                </p>
                                            </div>
                                        </CardHeader>

                                        <div className="mt-auto border-t bg-muted/5 p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenLogin(gstin)} title="Login to GST Portal">
                                                    <LogIn className="h-3.5 w-3.5 mr-2" />
                                                    Portal Login
                                                </Button>
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenCredentials(gstin)} title="Configure Credentials">
                                                    <Settings className="h-3.5 w-3.5 mr-2" />
                                                    Settings
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="secondary" size="sm" className="w-full" onClick={() => handleOpenConsolidated(gstin)} disabled={!gstin.metadata?.gstn?.credentials?.username} title="Download Consolidated Report">
                                                    Consolidated
                                                </Button>
                                                <Button size="sm" className="w-full" onClick={() => handleOpenDownload(gstin)} disabled={!gstin.metadata?.gstn?.credentials?.username} title="Download GSTR-1 JSON">
                                                    <Download className="h-3.5 w-3.5 mr-2" />
                                                    GSTR-1
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                                        <Plus className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">No GSTINs Registered</h3>
                                    <p className="text-muted-foreground max-w-sm mb-6">
                                        Add your first GSTIN to start managing returns and downloading reports.
                                    </p>
                                    <Button onClick={handleOpenAddGstin}>
                                        Add Your First GSTIN
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Dialogs */}
                    {customer && (
                        <>
                            <AddGstinDialog
                                open={activeDialog === "add-gstin"}
                                onOpenChange={handleCloseDialog}
                                customerUuid={customer.uuid}
                            />

                            {selectedGstin && (
                                <>
                                    <GstinCredentialsDialog
                                        open={activeDialog === "credentials"}
                                        onOpenChange={handleCloseDialog}
                                        gstin={selectedGstin}
                                    />

                                    <Gstr1DownloadDialog
                                        open={activeDialog === "download"}
                                        onOpenChange={handleCloseDialog}
                                        gstin={selectedGstin}
                                    />

                                    <ConsolidatedReportDialog
                                        open={activeDialog === "consolidated"}
                                        onOpenChange={handleCloseDialog}
                                        gstinUuid={selectedGstin.uuid}
                                        gstin={selectedGstin.gstin}
                                    />

                                    <GstnLoginDialog
                                        open={activeDialog === "login"}
                                        onOpenChange={handleCloseDialog}
                                        gstin={selectedGstin}
                                        onSuccess={() => {
                                            if (customer) {
                                                queryClient.invalidateQueries({ queryKey: gstzenKeys.gstins(customer.uuid) });
                                            }
                                            if (selectedGstin) {
                                                setActiveSessions(prev => ({
                                                    ...prev,
                                                    [selectedGstin.uuid]: true
                                                }));
                                            }
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

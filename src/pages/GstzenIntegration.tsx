import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Download, Settings, CheckCircle, XCircle, AlertCircle, Building, Mail, Phone, UserCircle, LogIn, LogOut, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGstins } from "@/hooks/useGstins";
import { GstnLoginDialog } from "@/components/gstin/GstnLoginDialog";
import { useQueryClient } from "@tanstack/react-query";
import { gstzenKeys } from "@/hooks/useGstzenCustomer";
import { gstzenApi } from "@/services/gstzen-api";
import type { Gstin } from "@/types/gstzen";

type DialogType = "none" | "download" | "login" | "consolidated";

// DEMO: Auto-login credentials
const DEMO_CREDENTIALS = {
    username: "demo@cloudzen.in",
    password: "gstzen!100Cr(^.^)S" // Demonstration access
};

export default function GstzenIntegration() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedGstin, setSelectedGstin] = useState<Gstin | null>(null);
    const [activeDialog, setActiveDialog] = useState<DialogType>("none");
    const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

    // Check if user is authenticated with GSTZen
    const gstzenToken = localStorage.getItem('gstzen_token');
    const isGstzenAuthenticated = !!gstzenToken;

    // DEMO: Auto-login effect
    useEffect(() => {
        const autoLogin = async () => {
            if (!gstzenToken && !isAutoLoggingIn) {
                setIsAutoLoggingIn(true);
                try {
                    console.log("Demo: Attempting auto-login...");
                    const result = await gstzenApi.login(DEMO_CREDENTIALS);
                    if (result.success && result.data) {
                        gstzenApi.setAuthToken(result.data.access);
                        localStorage.setItem("gstzen_email", DEMO_CREDENTIALS.username);
                        // Force reload to update state
                        window.location.reload();
                    } else {
                        console.warn("Demo auto-login failed:", result.error);
                    }
                } catch (e) {
                    console.error("Demo auto-login error", e);
                } finally {
                    setIsAutoLoggingIn(false);
                }
            }
        };
        autoLogin();
    }, [gstzenToken]);


    // Get GSTINs for this customer
    const { data: gstins = [], isLoading: gstinsLoading } = useGstins({ enabled: isGstzenAuthenticated });

    const isLoading = gstinsLoading;

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
        } else {
            return null;
        }
    };



    const handleOpenDownload = (gstin: Gstin) => {
        // Navigate to Gstr1Dashboard
        navigate(`/gstin/${gstin.uuid}/gstr1`, {
            state: { gstin }
        });
    };

    const handleOpenLogin = (gstin: Gstin) => {
        setSelectedGstin(gstin);
        setActiveDialog("login");
    };


    const handleCloseDialog = () => {
        setActiveDialog("none");
        setSelectedGstin(null);
    };

    const handleLogout = () => {
        gstzenApi.clearAuthToken();
        window.location.reload();
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
                                {isAutoLoggingIn ? <Loader2 className="h-6 w-6 text-amber-600 animate-spin" /> : <AlertCircle className="h-6 w-6 text-amber-600" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                                    {isAutoLoggingIn ? "Setting up Demo Environment..." : "GSTZen Authentication Required"}
                                </h3>
                                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                                    {isAutoLoggingIn ? "Please wait while we log you in automatically." : "To access GSTR1 reports and manage GSTINs, you need to sign in to your GSTZen account."}
                                </p>
                                {!isAutoLoggingIn && (
                                    <Button onClick={() => window.location.href = '/gstzen-login'}>
                                        Sign in to GSTZen
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Customer Profile Section */}
            {isGstzenAuthenticated && (
                <>
                    {/* Customer Profile Section Hidden as requested 
                    <div className="grid gap-6 md:grid-cols-2 mb-8">
                        <Card className="md:col-span-2 overflow-hidden">
                            <div className="bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left relative group">
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
                    */}


                    {/* GSTINs Management Section */}
                    <div className="space-y-6">
                        <div className="section-header">
                            <div>
                                <h2 className="section-title">Registered GSTINs</h2>
                                <p className="text-muted-foreground">Manage your GST identification numbers</p>
                            </div>
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
                                            <Button
                                                className="w-full shadow-sm"
                                                onClick={() => handleOpenDownload(gstin)}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Manage GSTR-1
                                            </Button>

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
                                    <Button onClick={() => { }} disabled>
                                        Contact Support to Add GSTIN
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Dialogs */}
                    {isGstzenAuthenticated && (
                        <>

                            <GstnLoginDialog
                                open={activeDialog === "login"}
                                onOpenChange={handleCloseDialog}
                                gstin={selectedGstin}
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: gstzenKeys.gstins() });
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
        </div>
    );
}

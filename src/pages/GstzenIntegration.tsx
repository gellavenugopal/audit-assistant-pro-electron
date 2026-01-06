import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Download, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGstzenCustomer } from "@/hooks/useGstzenCustomer";
import { useGstins } from "@/hooks/useGstins";
import { AddGstinDialog } from "@/components/gstin/AddGstinDialog";
import { GstinCredentialsDialog } from "@/components/gstin/GstinCredentialsDialog";
import { Gstr1DownloadDialog } from "@/components/gstr1/Gstr1DownloadDialog";
import type { Gstin } from "@/types/gstzen";

type DialogType = "none" | "add-gstin" | "credentials" | "download";

export default function GstzenIntegration() {
    const { user } = useAuth();
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

    const getStatusBadge = (gstin: Gstin) => {
        const hasCredentials = gstin.metadata?.gstn?.credentials?.username;
        const hasSession = gstin.metadata?.gstn?.session?.authtoken;

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

    const handleCloseDialog = () => {
        setActiveDialog("none");
        setSelectedGstin(null);
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">GSTR1 Integration</h1>
                <p className="text-muted-foreground">
                    Manage your GSTINs and download GSTR1 reports from the GST portal
                </p>
            </div>

            {/* Login Required Notice */}
            {!isGstzenAuthenticated && (
                <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
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
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Customer Profile</CardTitle>
                            <CardDescription>
                                Your GSTZen account details
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : customer ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Name:</span>
                                        <span>{customer.first_name} {customer.last_name}</span>
                                    </div>
                                    {customer.organization && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Organization:</span>
                                            <span>{customer.organization}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Email:</span>
                                        <span>{customer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Phone:</span>
                                        <span>{customer.phone}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground mb-4">
                                        No customer profile found. Please create one to continue.
                                    </p>
                                    <Button>Create Profile</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* GSTINs Management Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Registered GSTINs</CardTitle>
                                <CardDescription>
                                    Manage your GST identification numbers
                                </CardDescription>
                            </div>
                            <Button size="sm" disabled={!customer} onClick={handleOpenAddGstin}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add GSTIN
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : gstins.length > 0 ? (
                                <div className="space-y-4">
                                    {gstins.map((gstin) => (
                                        <Card key={gstin.uuid} className="hover:shadow-md transition-shadow">
                                            <CardContent className="pt-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-lg font-semibold font-mono">{gstin.gstin}</h3>
                                                            {getStatusBadge(gstin)}
                                                        </div>
                                                        {gstin.trade_name && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {gstin.trade_name}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-muted-foreground">State: {gstin.state || 'N/A'}</span>
                                                            <span className="text-muted-foreground">
                                                                Filing: {gstin.filing_frequency === 'quarterly' ? 'Quarterly' : 'Monthly'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenCredentials(gstin)}
                                                        >
                                                            <Settings className="w-4 h-4 mr-2" />
                                                            Configure
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            disabled={!gstin.metadata?.gstn?.credentials?.username}
                                                            onClick={() => handleOpenDownload(gstin)}
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Download GSTR1
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground mb-4">
                                        No GSTINs registered yet. Add a GSTIN to start downloading GSTR1 reports.
                                    </p>
                                    <Button disabled={!customer} onClick={handleOpenAddGstin}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Your First GSTIN
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

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
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

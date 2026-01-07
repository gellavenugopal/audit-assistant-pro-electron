
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    ArrowLeft,
    RefreshCw,
    AlertCircle
} from "lucide-react";
import { gstzenApi } from "@/services/gstzen-api";
import { useToast } from "@/components/ui/use-toast";
import { Gstr1ReportType } from "@/types/gstzen";
// import { Gstr1StatusTable } from "@/components/gstr1/Gstr1StatusTable"; // REMOVED
import { Gstr1DataGrid } from "@/components/gstr1/Gstr1DataGrid";
import { Gstr1SyncDialog } from "@/components/gstr1/Gstr1SyncDialog";
import { GstnLoginDialog } from "@/components/gstin/GstnLoginDialog";
import { CheckCircle2 } from "lucide-react";

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];

// Standard GSTR-1 Sections
const SECTIONS: { id: Gstr1ReportType; label: string }[] = [
    { id: 'b2b', label: 'B2B Invoices' },
    { id: 'b2cl', label: 'B2C Large' },
    { id: 'b2cs', label: 'B2C Small' },
    { id: 'cdnr', label: 'Credit/Debit Notes' },
    { id: 'exp', label: 'Exports' },
    // { id: 'val', label: 'Docs' }, 
    { id: 'hsnsum', label: 'HSN Summary' },
];

export default function Gstr1Dashboard() {
    const { gstinUuid } = useParams<{ gstinUuid: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const gstin = location.state?.gstin;
    const { toast } = useToast();

    // Year State
    const [year, setYear] = useState<string>("2023");

    // Month State (Default to April of selected year)
    // Format: MMYYYY (e.g. 042023)
    const [month, setMonth] = useState<string>(`042023`);

    // Section State
    const [activeSection, setActiveSection] = useState<Gstr1ReportType>('b2b');

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]); // Grid Data
    const [syncOpen, setSyncOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);

    const [hasActiveSession, setHasActiveSession] = useState(
        !!gstin?.metadata?.gstn?.session?.authtoken
    );

    // Generate Month Options for Selected Year (April -> March)
    const monthOptions = (() => {
        const y = parseInt(year);
        const options = [];
        // April (04) to Dec (12) of Year Y
        for (let m = 4; m <= 12; m++) {
            const mStr = m.toString().padStart(2, '0');
            options.push({ value: `${mStr}${y}`, label: `${getMonthName(m)} ${y}` });
        }
        // Jan (01) to March (03) of Year Y+1
        for (let m = 1; m <= 3; m++) {
            const mStr = m.toString().padStart(2, '0');
            options.push({ value: `${mStr}${y + 1}`, label: `${getMonthName(m)} ${y + 1}` });
        }
        return options;
    })();

    // Update active month when year changes (reset to April)
    useEffect(() => {
        setMonth(`04${year}`);
    }, [year]);

    // Check Session Status on Mount
    useEffect(() => {
        checkSessionStatus();
    }, [gstinUuid]);

    const checkSessionStatus = async () => {
        if (!gstinUuid) return;
        const freshGstin = await gstzenApi.getGstinDetails(gstinUuid);
        if (freshGstin) {
            setHasActiveSession(!!freshGstin.metadata?.gstn?.session?.authtoken);
        }
    };

    // Fetch Data when Month OR Section changes
    useEffect(() => {
        if (gstin?.gstin && month && activeSection) {
            fetchSectionData();
        }
    }, [gstin, month, activeSection]);

    const fetchSectionData = async () => {
        if (!gstin?.gstin) return;
        setLoading(true);
        setData([]); // Clear old data
        try {
            const result = await gstzenApi.fetchGstr1SectionData(
                gstin.gstin,
                month,
                activeSection
            );
            setData(result || []);
        } catch (error) {
            console.error("Fetch Data Error", error);
            // Silent error or toast? Silent is better for grid navigation
        } finally {
            setLoading(false);
        }
    };

    const handleSyncClick = () => {
        if (!gstin) return;

        if (hasActiveSession) {
            setSyncOpen(true);
        } else {
            toast({
                title: "Authentication Required",
                description: "You need to login to GST Portal first.",
            });
            setLoginOpen(true);
        }
    };

    function getMonthName(m: number) {
        const date = new Date();
        date.setMonth(m - 1);
        return date.toLocaleString('default', { month: 'long' });
    }

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-7xl animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">GSTR-1 Data View</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{gstin?.gstin}</span>
                            {hasActiveSession ? (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Portal Connected
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Disconnected
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Year Selector */}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                        <Label className="text-xs text-muted-foreground">Financial Year</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                        FY {y}-{y + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month Selector */}
                    <div className="flex flex-col gap-1 min-w-[150px]">
                        <Label className="text-xs text-muted-foreground">Return Period</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {monthOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleSyncClick} variant="outline" className="ml-2 mt-5">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync from Portal
                    </Button>
                </div>
            </div>

            {/* Main Content: Tabs + Grid */}
            <Tabs
                defaultValue="b2b"
                value={activeSection}
                onValueChange={(val) => setActiveSection(val as Gstr1ReportType)}
                className="w-full"
            >
                <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent p-0 mb-4">
                    {SECTIONS.map((sec) => (
                        <TabsTrigger
                            key={sec.id}
                            value={sec.id}
                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm border bg-background"
                        >
                            {sec.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="border rounded-md bg-card">
                    <Gstr1DataGrid
                        data={data}
                        section={activeSection}
                        loading={loading}
                    />
                </div>
            </Tabs>

            {/* Dialogs */}
            {gstin && (
                <Gstr1SyncDialog
                    open={syncOpen}
                    onOpenChange={setSyncOpen}
                    gstin={gstin}
                />
            )}

            {gstin && (
                <GstnLoginDialog
                    open={loginOpen}
                    onOpenChange={setLoginOpen}
                    gstin={gstin}
                    onSuccess={() => {
                        setHasActiveSession(true);
                        setLoginOpen(false);
                        checkSessionStatus();
                    }}
                />
            )}
        </div>
    );
}

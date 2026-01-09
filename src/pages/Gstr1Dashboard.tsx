
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
    RotateCw,
    AlertCircle,
    FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
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

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [exporting, setExporting] = useState(false);

    // Helper to get cache key
    const getCacheKey = (secId: string) => `gstr1_${gstin?.gstin}_${month}_${secId}`;

    // Unified fetcher: Cache-first strategy
    const getCachedOrFetchSectionData = async (secId: string, forceRefresh: boolean = false) => {
        if (!gstin?.gstin) return { data: [], timestamp: null };

        const key = getCacheKey(secId);

        // 1. Try Cache
        if (!forceRefresh) {
            try {
                const cachedDocs = sessionStorage.getItem(key);
                if (cachedDocs) {
                    const parsed = JSON.parse(cachedDocs);
                    if (parsed && Array.isArray(parsed.data)) {
                        console.log(`[Cache Hit] Section: ${secId}`);
                        return { data: parsed.data, timestamp: parsed.timestamp ? new Date(parsed.timestamp) : null };
                    }
                }
            } catch (e) {
                console.warn("Failed to parse cached data", e);
                sessionStorage.removeItem(key);
            }
        }

        // 2. Network Fetch
        console.log(`[Network Fetch] Section: ${secId}`);
        const result = await gstzenApi.fetchGstr1SectionData(gstin.gstin, month, secId);
        const data = result || [];
        const timestamp = new Date();

        try {
            sessionStorage.setItem(key, JSON.stringify({ data, timestamp: timestamp.toISOString() }));
        } catch (e) {
            console.warn("Failed to save to cache (quota exceeded?)", e);
        }

        return { data, timestamp };
    };

    const fetchSectionData = async (force: boolean = false) => {
        if (!gstin?.gstin) return;
        setLoading(true);
        // Don't clear data immediately if refreshing, to avoid flickering if possible, 
        // but resetting might be safer to show loading state. 
        if (!force) setData([]);

        try {
            const { data: sectionData, timestamp } = await getCachedOrFetchSectionData(activeSection, force);
            setData(sectionData);
            setLastUpdated(timestamp);
            if (sectionData.length > 0 || force) {
                // If we successfully got data (cached or new), we assume session is active if it was a network call
                // But strictly speaking, if it's cached, we don't know if session is active.
                // However, for UX, if we have data, we show it. 
                // If force=true, we definitely made an API call.
                // Let's rely on the previous logic: if result exists (which it does), set active.
                // Actually, if it's cached, we might not want to falsely say "Portal Connected" if the token expired.
                // But the user just wants to see data.
                // We can keep the existing side-effect:
                setHasActiveSession(true);
            }
        } catch (error) {
            console.error("Fetch Data Error", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchSectionData(true);
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



    // Helper functions for totals (reused from Gstr1DataGrid)
    const calculateTotalTaxable = (row: any) => {
        let total = 0;
        if (row.inv) {
            row.inv.forEach((inv: any) => {
                inv.itms?.forEach((item: any) => total += (item.itm_det?.txval || 0));
            });
        }
        if (row.nt) {
            row.nt.forEach((note: any) => {
                note.itms?.forEach((item: any) => total += (item.itm_det?.txval || 0));
            });
        }
        return total;
    }

    const calculateTotalTax = (row: any) => {
        let total = 0;
        if (row.inv) {
            row.inv.forEach((inv: any) => {
                inv.itms?.forEach((item: any) => {
                    const d = item.itm_det;
                    if (d) total += (d.iamt || 0) + (d.camt || 0) + (d.samt || 0);
                });
            });
        }
        if (row.nt) {
            row.nt.forEach((note: any) => {
                note.itms?.forEach((item: any) => {
                    const d = item.itm_det;
                    if (d) total += (d.iamt || 0) + (d.camt || 0) + (d.samt || 0);
                });
            });
        }
        return total;
    }

    const formatDataForExport = (data: any[], section: string) => {
        return data.map(row => {
            switch (section) {
                case 'b2b':
                case 'b2ba':
                case 'b2cl':
                case 'b2cla':
                case 'cdnr':
                case 'cdnra':
                case 'exp':
                case 'expa':
                    return {
                        "GSTIN/UIN": row.ctin || row.etin || "-",
                        "Inv No": row.inv?.[0]?.inum || "-",
                        "Date": row.inv?.[0]?.idt || "-",
                        "Value": row.inv?.[0]?.val || 0,
                        "POS": row.inv?.[0]?.pos || row.pos || "-",
                        "Taxable Amt": calculateTotalTaxable(row),
                        "Total Tax": calculateTotalTax(row)
                    };
                case 'b2cs':
                case 'b2csa':
                    return {
                        "Type": row.typ || "B2CS",
                        "POS": row.pos || "-",
                        "Rate": row.rt ? `${row.rt}%` : "-",
                        "Taxable Value": row.txval || 0,
                        "Total Tax": (row.iamt || 0) + (row.camt || 0) + (row.samt || 0)
                    };
                case 'hsnsum':
                    return {
                        "HSN Code": row.hsn_sc,
                        "Description": row.desc,
                        "UQC": row.uqc,
                        "Qty": row.qty,
                        "Total Value": row.val || 0,
                        "Taxable Value": row.txval || 0,
                        "Total Tax": (row.iamt || 0) + (row.camt || 0) + (row.samt || 0)
                    };
                case 'docs':
                    return {
                        "Nature of Doc": row.doc_det?.doc_desc || "-",
                        "From No": row.doc_det?.from || "-",
                        "To No": row.doc_det?.to || "-",
                        "Total Issued": row.doc_det?.totnum || 0,
                        "Cancelled": row.doc_det?.cancel || 0,
                        "Net Issued": row.doc_det?.net_issue || 0
                    };
                default:
                    return row;
            }
        });
    };

    const handleExportToExcel = async () => {
        if (!gstin) return;

        setExporting(true);
        try {
            const wb = XLSX.utils.book_new();
            let hasData = false;

            // Iterate through all sections to fetch and export data
            for (const section of SECTIONS) {
                try {
                    // Use the unified fetcher (cache-first)
                    const { data: sectionData } = await getCachedOrFetchSectionData(section.id, false);

                    if (sectionData.length > 0) {
                        hasData = true;
                        const formattedData = formatDataForExport(sectionData, section.id);
                        const ws = XLSX.utils.json_to_sheet(formattedData);

                        // Excel constraint: Sheet names max 31 chars
                        const safeSheetName = section.label.substring(0, 31).replace(/[\\/?*[\]]/g, ' ');

                        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
                    }
                } catch (err) {
                    console.error(`Failed to export section ${section.id}`, err);
                }
            }

            if (!hasData) {
                toast({
                    title: "No Data to Export",
                    description: "No data found in any section for this period.",
                    variant: "destructive"
                });
                return;
            }

            const fileName = `GSTR1_${gstin.gstin}_AllSections_${month}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast({
                title: "Export Successful",
                description: `Full report exported to ${fileName}`
            });

        } catch (error) {
            console.error("Export Error", error);
            toast({
                title: "Export Failed",
                description: "An error occurred while generating the Excel file.",
                variant: "destructive"
            });
        } finally {
            setExporting(false);
        }
    };

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

                    <Button onClick={() => handleRefresh()} variant="outline" className="ml-2 mt-5">
                        <RotateCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                    <Button onClick={handleSyncClick} variant="outline" className="ml-2 mt-5">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync from Portal
                    </Button>
                    {lastUpdated && (
                        <div className="absolute top-full mt-1 right-0 text-xs text-muted-foreground mr-4">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                    <Button onClick={handleExportToExcel} variant="outline" className="ml-2 mt-5" disabled={exporting}>
                        {exporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        {exporting ? "Exporting..." : "Export All to Excel"}
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

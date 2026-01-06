import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { gstzenApi } from "@/services/gstzen-api";
import { useToast } from "@/components/ui/use-toast";

interface ConsolidatedReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gstinUuid: string;
    gstin: string;
}

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];
const REPORT_TYPES = [
    { value: "gstr1", label: "GSTR-1" },
    { value: "gstr3b", label: "GSTR-3B" },
    { value: "gstr2a", label: "GSTR-2A" },
    { value: "gstr2b", label: "GSTR-2B" },
];

export function ConsolidatedReportDialog({
    open,
    onOpenChange,
    gstinUuid,
    gstin,
}: ConsolidatedReportDialogProps) {
    const [year, setYear] = useState<string>("2023");
    const [reportType, setReportType] = useState<string>("gstr1");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleDownload = async () => {
        setLoading(true);
        try {
            const response = await gstzenApi.getConsolidatedReport(gstinUuid, parseInt(year), reportType);

            if (response.success && response.data) {
                // Create a downloadable file
                const jsonString = JSON.stringify(response.data, null, 2);
                const blob = new Blob([jsonString], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${gstin}_${reportType}_${year}_consolidated.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast({
                    title: "Download Successful",
                    description: `Consolidated ${reportType.toUpperCase()} report for ${year} downloaded.`,
                });
                onOpenChange(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Download Failed",
                    description: response.error || "Failed to fetch report data.",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Download Consolidated Report</DialogTitle>
                    <DialogDescription>
                        Select year and report type for {gstin}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right">
                            Year
                        </Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                        {y}-{y + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Report Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REPORT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleDownload} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Download JSON
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

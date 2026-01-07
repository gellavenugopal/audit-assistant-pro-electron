import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { useGstr1Download, formatFilingPeriod, getReportTypeDisplayName } from "@/hooks/useGstr1Download";
import type { Gstin, Gstr1ReportType } from "@/types/gstzen";

const downloadSchema = z.object({
    month: z.string().min(1, "Month is required"),
    year: z.string().min(1, "Year is required"),
    report_type: z.string().min(1, "Report type is required"),
});

type DownloadFormValues = z.infer<typeof downloadSchema>;

interface Gstr1DownloadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gstin: Gstin;
}

const REPORT_TYPES: Gstr1ReportType[] = [
    'retsum',
    'b2b',
    'b2cs',
    'b2cl',
    'cdnr',
    'cdnur',
    'exp',
    'hsnsum',
    'nil',
];

const MONTHS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

const getRecentYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push((currentYear - i).toString());
    }
    return years;
};

export function Gstr1DownloadDialog({
    open,
    onOpenChange,
    gstin,
}: Gstr1DownloadDialogProps) {
    const downloadMutation = useGstr1Download();
    const [downloadedData, setDownloadedData] = useState<any>(null);

    const form = useForm<DownloadFormValues>({
        resolver: zodResolver(downloadSchema),
        defaultValues: {
            month: new Date().getMonth().toString(),
            year: new Date().getFullYear().toString(),
            report_type: "retsum",
        },
    });

    const onSubmit = async (data: DownloadFormValues) => {
        const filingPeriod = formatFilingPeriod(parseInt(data.month), parseInt(data.year));

        try {
            const result = await downloadMutation.mutateAsync({
                gstin: gstin.gstin,
                filing_period: filingPeriod,
                api_name: data.report_type as Gstr1ReportType,
            });

            setDownloadedData(result);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handleExport = () => {
        if (!downloadedData) return;

        // Convert to JSON and download
        const dataStr = JSON.stringify(downloadedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `gstr1_${gstin.gstin}_${form.getValues("month")}_${form.getValues("year")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Download GSTR1 Report</DialogTitle>
                    <DialogDescription>
                        Download GSTR1 data for {gstin.gstin}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="month"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Month</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select month" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {MONTHS.map((month) => (
                                                    <SelectItem key={month.value} value={month.value}>
                                                        {month.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Year</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select year" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {getRecentYears().map((year) => (
                                                    <SelectItem key={year} value={year}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="report_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Report Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select report type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {REPORT_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {getReportTypeDisplayName(type)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose the type of GSTR1 data to download
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {downloadedData && (
                            <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium">Download Complete</p>
                                            <p className="text-xs text-muted-foreground">
                                                Report data received successfully
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExport}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Export JSON
                                    </Button>
                                </div>
                            </Card>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDownloadedData(null);
                                    onOpenChange(false);
                                }}
                            >
                                Close
                            </Button>
                            <Button
                                type="submit"
                                disabled={downloadMutation.isPending}
                            >
                                {downloadMutation.isPending ? "Downloading..." : "Download"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

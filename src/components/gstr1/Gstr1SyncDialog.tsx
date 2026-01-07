import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useGstr1Download, formatFilingPeriod } from "@/hooks/useGstr1Download";
import type { Gstin } from "@/types/gstzen";
import { useToast } from "@/components/ui/use-toast";

interface Gstr1SyncDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gstin: Gstin;
    onSuccess?: () => void;
}

const getRecentYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push((currentYear - i).toString());
    }
    return years;
};

export function Gstr1SyncDialog({
    open,
    onOpenChange,
    gstin,
    onSuccess
}: Gstr1SyncDialogProps) {
    const { toast } = useToast();
    const downloadMutation = useGstr1Download();

    // Default to current FY or user selected? 
    // Usually FY starts in April. If current month < April, default to previous year.
    const currentMonth = new Date().getMonth(); // 0-11
    const defaultYear = currentMonth < 3
        ? (new Date().getFullYear() - 1).toString()
        : new Date().getFullYear().toString();

    const [year, setYear] = useState<string>(defaultYear);
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);

    const handleSync = async () => {
        setSyncing(true);
        const fy = parseInt(year);
        // Generate filing periods: April (4) of FY to March (3) of FY+1
        const months = [
            { num: 4, y: fy }, { num: 5, y: fy }, { num: 6, y: fy },
            { num: 7, y: fy }, { num: 8, y: fy }, { num: 9, y: fy },
            { num: 10, y: fy }, { num: 11, y: fy }, { num: 12, y: fy },
            { num: 1, y: fy + 1 }, { num: 2, y: fy + 1 }, { num: 3, y: fy + 1 }
        ];

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < months.length; i++) {
            const { num, y } = months[i];
            const period = formatFilingPeriod(num, y);
            const monthName = new Date(y, num - 1).toLocaleString('default', { month: 'long' });

            setProgress({
                current: i + 1,
                total: months.length,
                message: `Syncing ${monthName} ${y}...`
            });

            try {
                // We use 'retsum' (Return Summary) as the primary sync target for dashboard
                await downloadMutation.mutateAsync({
                    gstin: gstin.gstin,
                    filing_period: period,
                    api_name: 'retsum'
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to sync ${period}`, error);
                failCount++;
            }
        }

        setSyncing(false);
        setProgress(null);

        toast({
            title: "Sync Completed",
            description: `Successfully synced ${successCount} months. ${failCount > 0 ? `${failCount} failed.` : ''}`,
            variant: failCount > 0 ? "destructive" : "default"
        });

        if (onSuccess) onSuccess();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !syncing && onOpenChange(val)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Sync GSTR-1 from Portal</DialogTitle>
                    <DialogDescription>
                        Select the Financial Year to sync data from GST Portal.
                        This will download the Return Summary for all months.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Financial Year</label>
                        <Select value={year} onValueChange={setYear} disabled={syncing}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {getRecentYears().map((y) => (
                                    <SelectItem key={y} value={y}>
                                        FY {y}-{parseInt(y) + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {progress && (
                        <div className="bg-muted p-4 rounded-md space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{progress.message}</span>
                                <span className="text-muted-foreground">{Math.round((progress.current / progress.total) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-in-out"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>
                        Cancel
                    </Button>
                    <Button onClick={handleSync} disabled={syncing}>
                        {syncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Start Sync
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

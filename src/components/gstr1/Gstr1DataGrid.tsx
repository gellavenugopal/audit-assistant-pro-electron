import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Gstr1DataGridProps {
    data: any[];
    section: string;
    loading: boolean;
}

export function Gstr1DataGrid({ data, section, loading }: Gstr1DataGridProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[500px] border rounded-lg bg-muted/5">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Loading data...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[500px] border rounded-lg bg-muted/5 border-dashed">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Table className="h-6 w-6 text-muted-foreground opacity-50" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">No Data Available</h3>
                <p className="text-sm text-muted-foreground">No records found for this section.</p>
            </div>
        );
    }

    const formatCurrency = (val: any) => {
        const num = Number(val);
        if (isNaN(num)) return "-";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(num);
    };

    // Define columns based on section
    const getColumns = (section: string) => {
        const numericStyle = "text-right font-mono";

        switch (section) {
            case 'b2b':
            case 'b2ba':
            case 'b2cl':
            case 'b2cla':
            case 'cdnr':
            case 'cdnra':
            case 'exp':
            case 'expa':
                return [
                    { header: "GSTIN/UIN", accessor: (row: any) => row.ctin || row.etin || <span className="text-muted-foreground">-</span>, className: "w-[180px]" },
                    { header: "Inv No", accessor: (row: any) => row.inv?.[0]?.inum || <span className="text-muted-foreground">-</span>, className: "font-medium" },
                    { header: "Date", accessor: (row: any) => row.inv?.[0]?.idt || <span className="text-muted-foreground">-</span> },
                    { header: "Value", accessor: (row: any) => formatCurrency(row.inv?.[0]?.val), className: numericStyle },
                    { header: "POS", accessor: (row: any) => row.inv?.[0]?.pos || row.pos || <span className="text-muted-foreground">-</span>, className: "text-center" },
                    { header: "Taxable Amt", accessor: (row: any) => formatCurrency(calculateTotalTaxable(row)), className: numericStyle },
                    { header: "Total Tax", accessor: (row: any) => formatCurrency(calculateTotalTax(row)), className: numericStyle },
                ];
            case 'b2cs':
            case 'b2csa':
                return [
                    { header: "Type", accessor: (row: any) => <Badge variant="outline">{row.typ || "B2CS"}</Badge> },
                    { header: "POS", accessor: (row: any) => row.pos || <span className="text-muted-foreground">-</span> },
                    { header: "Rate", accessor: (row: any) => (row.rt ? `${row.rt}%` : <span className="text-muted-foreground">-</span>), className: "text-right" },
                    { header: "Taxable Value", accessor: (row: any) => formatCurrency(row.txval), className: numericStyle },
                    { header: "Total Tax", accessor: (row: any) => formatCurrency((row.iamt || 0) + (row.camt || 0) + (row.samt || 0)), className: numericStyle },
                ];
            case 'hsnsum':
                return [
                    { header: "HSN Code", accessor: (row: any) => <span className="font-mono text-primary font-medium">{row.hsn_sc}</span> },
                    { header: "Description", accessor: (row: any) => <span className="px-2 truncate max-w-[250px] block" title={row.desc}>{row.desc}</span>, className: "w-[300px]" },
                    { header: "UQC", accessor: (row: any) => <Badge variant="secondary" className="font-mono text-xs">{row.uqc}</Badge> },
                    { header: "Qty", accessor: (row: any) => row.qty, className: "text-right" },
                    { header: "Total Value", accessor: (row: any) => formatCurrency(row.val), className: numericStyle },
                    { header: "Taxable Value", accessor: (row: any) => formatCurrency(row.txval), className: numericStyle },
                    { header: "Total Tax", accessor: (row: any) => formatCurrency((row.iamt || 0) + (row.camt || 0) + (row.samt || 0)), className: numericStyle },
                ];
            case 'docs':
                return [
                    { header: "Nature of Doc", accessor: (row: any) => row.doc_det?.doc_desc || "-" },
                    { header: "From No", accessor: (row: any) => row.doc_det?.from || "-", className: "font-mono" },
                    { header: "To No", accessor: (row: any) => row.doc_det?.to || "-", className: "font-mono" },
                    { header: "Total Issued", accessor: (row: any) => row.doc_det?.totnum || "-", className: "text-center" },
                    { header: "Cancelled", accessor: (row: any) => <span className="text-destructive font-medium">{row.doc_det?.cancel || 0}</span>, className: "text-center" },
                    { header: "Net Issued", accessor: (row: any) => <span className="text-primary font-bold">{row.doc_det?.net_issue || 0}</span>, className: "text-center" },
                ];
            default:
                return [{ header: "Raw Data", accessor: (row: any) => <pre className="text-xs">{JSON.stringify(row, null, 2)}</pre> }];
        }
    };

    // Helper for nested totals
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

    const columns = getColumns(section);

    return (
        <Card className="border shadow-sm overflow-hidden bg-background">
            <CardContent className="p-0">
                <ScrollArea className="h-[550px] w-full">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-primary/5 backdrop-blur-sm border-b shadow-sm">
                            <TableRow className="hover:bg-transparent border-b-primary/10">
                                {columns.map((col, idx) => (
                                    <TableHead
                                        key={idx}
                                        className={cn(
                                            "h-11 text-xs uppercase tracking-wider font-semibold text-primary/80",
                                            col.className?.includes("text-right") ? "text-right" : "",
                                            col.className?.includes("text-center") ? "text-center" : "",
                                        )}
                                    >
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, rowIdx) => (
                                <TableRow
                                    key={rowIdx}
                                    className="hover:bg-muted/30 transition-colors border-b-border/50 data-[state=selected]:bg-muted"
                                >
                                    {columns.map((col, colIdx) => (
                                        <TableCell
                                            key={colIdx}
                                            className={cn(
                                                "py-3 text-sm",
                                                col.className
                                            )}
                                        >
                                            {col.accessor(row)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

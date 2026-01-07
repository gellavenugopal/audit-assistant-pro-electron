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

interface Gstr1DataGridProps {
    data: any[];
    section: string;
    loading: boolean;
}

export function Gstr1DataGrid({ data, section, loading }: Gstr1DataGridProps) {
    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading data...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No data found for this section.</div>;
    }

    // Define columns based on section
    const getColumns = (section: string) => {
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
                    { header: "GSTIN", accessor: (row: any) => row.ctin || row.etin || "-" },
                    { header: "Inv No", accessor: (row: any) => row.inv?.[0]?.inum || "-" },
                    { header: "Date", accessor: (row: any) => row.inv?.[0]?.idt || "-" },
                    { header: "Value", accessor: (row: any) => row.inv?.[0]?.val || "-" },
                    { header: "POS", accessor: (row: any) => row.inv?.[0]?.pos || row.pos || "-" },
                    { header: "Taxable", accessor: (row: any) => calculateTotalTaxable(row) },
                    { header: "Tax", accessor: (row: any) => calculateTotalTax(row) },
                ];
            case 'b2cs':
            case 'b2csa':
                return [
                    { header: "Type", accessor: (row: any) => row.typ || "-" },
                    { header: "POS", accessor: (row: any) => row.pos || "-" },
                    { header: "Rate", accessor: (row: any) => row.rt || "-" },
                    { header: "Taxable", accessor: (row: any) => row.txval || "-" },
                    { header: "Tax", accessor: (row: any) => (row.iamt || 0) + (row.camt || 0) + (row.samt || 0) },
                ];
            case 'hsnsum':
                return [
                    { header: "HSN", accessor: (row: any) => row.hsn_sc },
                    { header: "Desc", accessor: (row: any) => row.desc },
                    { header: "UQC", accessor: (row: any) => row.uqc },
                    { header: "Qty", accessor: (row: any) => row.qty },
                    { header: "Total Value", accessor: (row: any) => row.val },
                    { header: "Taxable", accessor: (row: any) => row.txval },
                    { header: "Tax", accessor: (row: any) => (row.iamt || 0) + (row.camt || 0) + (row.samt || 0) },
                ];
            case 'docs':
                return [
                    { header: "Nature", accessor: (row: any) => row.doc_det?.doc_desc || "-" },
                    { header: "From", accessor: (row: any) => row.doc_det?.from || "-" },
                    { header: "To", accessor: (row: any) => row.doc_det?.to || "-" },
                    { header: "Total", accessor: (row: any) => row.doc_det?.totnum || "-" },
                    { header: "Cancelled", accessor: (row: any) => row.doc_det?.cancel || "-" },
                    { header: "Net", accessor: (row: any) => row.doc_det?.net_issue || "-" },
                ];
            default:
                // Generic fallback - just show raw JSON keys? Or empty.
                // Let's assume we mapped everything.
                return [{ header: "Data", accessor: (row: any) => JSON.stringify(row) }];
        }
    };

    // Helper for nested totals
    const calculateTotalTaxable = (row: any) => {
        let total = 0;
        // b2b structure: ctin -> inv -> itms -> itm_det
        if (row.inv) {
            row.inv.forEach((inv: any) => {
                inv.itms?.forEach((item: any) => {
                    total += (item.itm_det?.txval || 0);
                });
            });
        }
        // cdnr structure: ctin -> nt -> itms -> itm_det
        if (row.nt) {
            row.nt.forEach((note: any) => {
                note.itms?.forEach((item: any) => {
                    total += (item.itm_det?.txval || 0);
                });
            });
        }
        return total.toFixed(2);
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
        return total.toFixed(2);
    }

    const columns = getColumns(section);

    return (
        <Card className="border shadow-sm">
            <CardContent className="p-0">
                <ScrollArea className="h-[500px] w-full">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow>
                                {columns.map((col, idx) => (
                                    <TableHead key={idx}>{col.header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, rowIdx) => (
                                <TableRow key={rowIdx}>
                                    {columns.map((col, colIdx) => (
                                        <TableCell key={colIdx} className="font-medium">
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

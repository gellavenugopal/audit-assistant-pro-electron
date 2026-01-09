/**
 * React Query hooks for GSTR1 downloads
 */

import { useMutation } from '@tanstack/react-query';
import { gstzenApi } from '@/services/gstzen-api';
import type { Gstr1DownloadRequest, Gstr1ReportType } from '@/types/gstzen';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to download GSTR1 reports
 */
export function useGstr1Download() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Gstr1DownloadRequest) => {
      const response = await gstzenApi.downloadGstr1(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to download GSTR1');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Download Complete',
        description: `GSTR1 ${variables.api_name.toUpperCase()} downloaded successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download GSTR1 report',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to download GSTR1 summary
 */
export function useGstr1Summary() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      gstin,
      filingPeriod,
    }: {
      gstin: string;
      filingPeriod: string;
    }) => {
      const response = await gstzenApi.getGstr1Summary(gstin, filingPeriod);
      if (!response.success) {
        throw new Error(response.error || 'Failed to download GSTR1 summary');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'GSTR1 summary downloaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download GSTR1 summary',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to download GSTR1 B2B invoices
 */
export function useGstr1B2B() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      gstin,
      filingPeriod,
    }: {
      gstin: string;
      filingPeriod: string;
    }) => {
      const response = await gstzenApi.getGstr1B2B(gstin, filingPeriod);
      if (!response.success) {
        throw new Error(response.error || 'Failed to download B2B data');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'GSTR1 B2B data downloaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download B2B data',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to download GSTR1 B2CS invoices
 */
export function useGstr1B2CS() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      gstin,
      filingPeriod,
    }: {
      gstin: string;
      filingPeriod: string;
    }) => {
      const response = await gstzenApi.getGstr1B2CS(gstin, filingPeriod);
      if (!response.success) {
        throw new Error(response.error || 'Failed to download B2CS data');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'GSTR1 B2CS data downloaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download B2CS data',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Utility function to format filing period
 * @param month - Month (1-12)
 * @param year - Full year (e.g., 2024)
 * @returns Filing period in MMYYYY format
 */
export function formatFilingPeriod(month: number, year: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `${monthStr}${year}`;
}

/**
 * Utility function to parse filing period
 * @param filingPeriod - Filing period in MMYYYY format
 * @returns Object with month and year
 */
export function parseFilingPeriod(filingPeriod: string): { month: number; year: number } {
  const month = parseInt(filingPeriod.substring(0, 2), 10);
  const year = parseInt(filingPeriod.substring(2), 10);
  return { month, year };
}

/**
 * Get display name for report type
 */
export function getReportTypeDisplayName(reportType: Gstr1ReportType): string {
  const displayNames: Record<Gstr1ReportType, string> = {
    'retsum': 'Return Summary',
    'b2b': 'B2B Invoices',
    'b2b-einv': 'B2B E-Invoices',
    'b2ba': 'B2B Amendment',
    'b2cs': 'B2C Small',
    'b2csa': 'B2C Small Amendment',
    'b2cl': 'B2C Large',
    'b2cla': 'B2C Large Amendment',
    'cdnr': 'Credit/Debit Notes (Registered)',
    'cdnr-einv': 'Credit/Debit Notes E-Invoice',
    'cdnra': 'Credit/Debit Notes Amendment',
    'cdnur': 'Credit/Debit Notes (Unregistered)',
    'cdnur-einv': 'Credit/Debit Notes Unregistered E-Invoice',
    'cdnura': 'Credit/Debit Notes Unregistered Amendment',
    'exp': 'Export Invoices',
    'exp-einv': 'Export E-Invoices',
    'expa': 'Export Amendment',
    'at': 'Advance Tax',
    'ata': 'Advance Tax Amendment',
    'txp': 'Tax Payment',
    'txpa': 'Tax Payment Amendment',
    'hsnsum': 'HSN Summary',
    'nil': 'NIL Rated Supplies',
    'ecom': 'E-commerce',
    'ecoma': 'E-commerce Amendment',
    'supeco': 'Supplies through E-commerce',
    'supecoa': 'Supplies through E-commerce Amendment',
  };

  return displayNames[reportType] || reportType.toUpperCase();
}

/**
 * React Query hooks for GSTIN management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gstzenApi } from '@/services/gstzen-api';
import type { Gstin, AddGstinRequest, UpdateGstinCredentialsRequest } from '@/types/gstzen';
import { useToast } from '@/hooks/use-toast';
import { gstzenKeys } from './useGstzenCustomer';

/**
 * Hook to get all GSTINs for a customer
 */
export function useGstins(customerUuid: string | null) {
  return useQuery({
    queryKey: gstzenKeys.gstins(customerUuid || ''),
    queryFn: async () => {
      if (!customerUuid) throw new Error('Customer UUID is required');
      const response = await gstzenApi.getGstins(customerUuid);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch GSTINs');
      }
      return response.data || [];
    },
    enabled: !!customerUuid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to add a new GSTIN
 */
export function useAddGstin(customerUuid: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AddGstinRequest) => {
      const response = await gstzenApi.addGstin(customerUuid, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to add GSTIN');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate GSTINs list
      queryClient.invalidateQueries({ queryKey: gstzenKeys.gstins(customerUuid) });

      toast({
        title: 'Success',
        description: 'GSTIN added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add GSTIN',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update GSTIN credentials
 */
export function useUpdateGstinCredentials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateGstinCredentialsRequest) => {
      const response = await gstzenApi.updateGstinCredentials(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update credentials');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate all GSTIN queries since we don't know the customer UUID
      queryClient.invalidateQueries({ queryKey: gstzenKeys.all });

      toast({
        title: 'Success',
        description: 'GSTIN credentials updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update credentials',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a GSTIN
 */
export function useDeleteGstin(customerUuid: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (gstinUuid: string) => {
      const response = await gstzenApi.deleteGstin(gstinUuid);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete GSTIN');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate GSTINs list
      queryClient.invalidateQueries({ queryKey: gstzenKeys.gstins(customerUuid) });

      toast({
        title: 'Success',
        description: 'GSTIN deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete GSTIN',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to test GSTIN connection
 */
export function useTestGstinConnection() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (gstinUuid: string) => {
      const response = await gstzenApi.testGstinConnection(gstinUuid);
      if (!response.success) {
        throw new Error(response.error || 'Failed to test connection');
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Connection Test',
        description: data?.status === 'success' 
          ? 'Successfully connected to GSTN portal' 
          : 'Connection test completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to GSTN portal',
        variant: 'destructive',
      });
    },
  });
}

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

/**
 * Hook to generate OTP for GSTN login
 */
export function useGenerateOtp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { gstin: string; username: string }) => {
      const response = await gstzenApi.generateOtp(data.gstin, data.username);
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate OTP');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'OTP Sent',
        description: 'Please check your registered mobile/email for OTP',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'OTP Failed',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to verify OTP and establish session
 */
export function useEstablishSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { gstin: string; otp: string }) => {
      const response = await gstzenApi.establishSession(data.gstin, data.otp);
      if (!response.success) {
        throw new Error(response.error || 'Failed to establish session');
      }
      return response.data;
    },
    onSuccess: (data) => {
       if (data.status_cd === "1") {
        toast({
          title: 'Login Successful',
          description: 'Successfully connected to GST Portal',
        });
      } else {
         toast({
          title: 'Login Status',
          description: 'Session call completed.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to verify OTP',
        variant: 'destructive',
      });
    },
  });
}

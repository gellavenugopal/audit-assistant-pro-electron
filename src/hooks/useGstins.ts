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
export function useGstins(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: gstzenKeys.gstins(),
    queryFn: async () => {
      const response = await gstzenApi.getGstins();
      if (!response.success) {
        // Handle Stale Token (401)
        if (typeof response.error === 'string' && (response.error.includes('token_not_valid') || response.error.includes('401') || response.error.includes('Authentication credentials were not provided'))) {
           console.warn('[useGstins] Stale or missing token detected. Clearing auth and reloading.');
           // Only clear and reload if we *thought* we were logged in/enabled
           if (options.enabled !== false) {
               gstzenApi.clearAuthToken();
               window.location.reload();
           }
           return [];
        }
        throw new Error(response.error || 'Failed to fetch GSTINs');
      }
      return response.data || [];
    },
    retry: false, // Don't retry on 401s
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options.enabled, // Pass enabled flag to React Query
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

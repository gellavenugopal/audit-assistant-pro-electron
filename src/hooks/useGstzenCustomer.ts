/**
 * React Query hook for GSTZen customer management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gstzenApi } from '@/services/gstzen-api';
import type { GstzenCustomer, CreateCustomerRequest } from '@/types/gstzen';
import { useToast } from '@/hooks/use-toast';

// Query keys
export const gstzenKeys = {
  all: ['gstzen'] as const,
  customers: () => [...gstzenKeys.all, 'customers'] as const,
  customer: (email: string) => [...gstzenKeys.customers(), email] as const,
  gstins: (customerUuid: string) => [...gstzenKeys.all, 'gstins', customerUuid] as const,
};

/**
 * Hook to get customer by email
 */
export function useGstzenCustomer(email: string | null) {
  // Use GSTZen login email, not Supabase email
  const gstzenEmail = localStorage.getItem('gstzen_email');
  const actualEmail = gstzenEmail || email;
  
  const query = useQuery({
    queryKey: gstzenKeys.customer(actualEmail || ''),
    queryFn: async () => {
      if (!actualEmail) throw new Error('Email is required');
      const response = await gstzenApi.getCustomerByEmail(actualEmail);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer');
      }
      return response.data;
    },
    enabled: !!actualEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Return data in expected structure
  return {
    customer: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCustomerRequest) => {
      const response = await gstzenApi.createCustomer(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create customer');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate customer queries
      queryClient.invalidateQueries({ queryKey: gstzenKeys.customers() });
      
      // Update the specific customer cache
      if (data) {
        queryClient.setQueryData(gstzenKeys.customer(data.email), data);
      }

      toast({
        title: 'Success',
        description: 'Customer profile created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update customer details
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      customerUuid,
      data,
    }: {
      customerUuid: string;
      data: Partial<CreateCustomerRequest>;
    }) => {
      const response = await gstzenApi.updateCustomer(customerUuid, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update customer');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate and update customer queries
      queryClient.invalidateQueries({ queryKey: gstzenKeys.customers() });
      
      if (data) {
        queryClient.setQueryData(gstzenKeys.customer(data.email), data);
      }

      toast({
        title: 'Success',
        description: 'Customer profile updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update customer',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get or create customer based on current user
 */
export function useGetOrCreateCustomer(email: string | null, userData?: CreateCustomerRequest) {
  const customerQuery = useGstzenCustomer(email);
  const createMutation = useCreateCustomer();

  const ensureCustomer = async () => {
    if (customerQuery.customer) {
      return customerQuery.customer;
    }

    if (!userData) {
      throw new Error('Customer data required for creation');
    }

    return createMutation.mutateAsync(userData);
  };

  return {
    customer: customerQuery.customer,
    isLoading: customerQuery.isLoading || createMutation.isPending,
    error: customerQuery.error || createMutation.error,
    ensureCustomer,
  };
}

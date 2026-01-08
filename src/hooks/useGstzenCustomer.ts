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
  customer: () => [...gstzenKeys.customers(), 'profile'] as const,
  gstins: () => [...gstzenKeys.all, 'gstins'] as const,
};


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
        queryClient.setQueryData(gstzenKeys.customer(), data);
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


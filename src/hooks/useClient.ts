import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientDetails {
  id: string;
  name: string;
  industry: string | null;
  constitution: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  pan: string | null;
  cin: string | null;
  state: string | null;
  pin: string | null;
  notes: string | null;
}

export function useClient(clientId?: string | null) {
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select(
            'id, name, industry, constitution, contact_person, contact_email, contact_phone, address, pan, cin, state, pin, notes'
          )
          .eq('id', clientId)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) setClient((data as any) || null);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load client');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { client, loading, error };
}

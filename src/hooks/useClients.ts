import { useState, useEffect } from 'react';
import { getSQLiteClient } from '@/integrations/sqlite/client';

const db = getSQLiteClient();

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  constitution: string | null;
  contact_person: string | null;
  contact_email: string | null;
  status: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('clients')
        .select('id, name, industry, constitution, contact_person, contact_email, status')
        .eq('status', 'active')
        .order('name', { ascending: true })
        .execute();

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, loading, refetch: fetchClients };
}

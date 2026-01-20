/**
 * SQLite React Hooks
 * Replaces @supabase/auth-helpers-react
 */

import { useEffect, useState } from 'react';
import { getSQLiteClient, auth } from './client';

/**
 * Hook to get current user
 */
export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const db = getSQLiteClient();
    const currentUser = db.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);
  
  return { user, isLoading };
}

/**
 * Hook to get current session
 */
export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await auth.getSession();
      setSession(data.session);
      setIsLoading(false);
    };
    
    loadSession();
  }, []);
  
  return { session, isLoading };
}

/**
 * Hook to get SQLite client
 */
export function useSQLiteClient() {
  return getSQLiteClient();
}

/**
 * Hook for session context (compatibility with Supabase)
 */
export function useSessionContext() {
  const { session, isLoading } = useSession();
  
  return {
    session,
    isLoading,
    error: null
  };
}

/**
 * Hook for Supabase client (returns SQLite client)
 */
export function useSupabaseClient() {
  return getSQLiteClient();
}

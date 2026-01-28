// This file has been disabled - the app now uses SQLite instead of Supabase
// If you need database operations, use: import { getSQLiteClient } from '@/integrations/sqlite/client';

// Dummy export to prevent import errors in legacy code
export const supabase = {
  from: () => {
    console.warn('⚠️  Supabase client is disabled. Use SQLiteClient instead.');
    return {
      select: () => ({ data: null, error: new Error('Supabase is disabled') }),
      insert: () => ({ data: null, error: new Error('Supabase is disabled') }),
      update: () => ({ data: null, error: new Error('Supabase is disabled') }),
      delete: () => ({ data: null, error: new Error('Supabase is disabled') }),
    };
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: new Error('Supabase storage is disabled') }),
      download: async () => ({ data: null, error: new Error('Supabase storage is disabled') }),
    }),
  },
};

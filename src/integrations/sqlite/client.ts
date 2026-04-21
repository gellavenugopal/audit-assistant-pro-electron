/**
 * SQLite Client - Replaces Supabase Client
 * Provides compatible API for easy migration
 * 
 * NOTE: This file uses IPC to communicate with Electron main process
 * because SQLite (better-sqlite3) is a native Node.js module that
 * cannot be bundled by Vite for the browser/renderer process.
 */

// Type definitions (without importing the actual modules)
export interface DatabaseManager {
  from: (table: string) => any;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, fullName: string) => Promise<any>;
  logout: () => void;
  getCurrentUser: () => any;
}

// Singleton instance (will be initialized via IPC)
let dbInstance: DatabaseManager | null = null;

/**
 * Get SQLite database instance via Electron IPC
 * This communicates with the main process where SQLite actually runs
 */
export function getSQLiteClient(): DatabaseManager {
  if (!dbInstance) {
    const electronAPI = (window as any).electronAPI;
    
    if (!electronAPI) {
      throw new Error('Electron API not available. This app must run in Electron.');
    }

    // Create a proxy that uses IPC to communicate with main process
    // The actual SQLite operations happen in the main process
    dbInstance = createIPCClient(electronAPI);
  }
  return dbInstance;
}

/**
 * Create an IPC-based client that proxies calls to Electron main process
 */
function createIPCClient(electronAPI: any): DatabaseManager {
  return {
    from: (table: string) => {
      const normalizeResult = (result: any) => ({
        data: result?.data ?? null,
        error: result?.error ?? null,
      });

      const asExecutable = (execute: () => Promise<any>) => ({
        execute,
        then: (resolve: any, reject: any) => execute().then(resolve, reject),
      });

      const createQuery = (
        action: 'select' | 'update' | 'delete',
        options: {
          columns?: string;
          data?: any;
          filters?: any[];
          orderBy?: { column: string; ascending: boolean };
          limit?: number;
        } = {}
      ) => {
        const state = {
          columns: options.columns,
          data: options.data,
          filters: options.filters || [],
          orderBy: options.orderBy,
          limit: options.limit,
        };

        const execute = async () => {
          const result = await electronAPI.sqliteQuery?.({
            table,
            action,
            columns: state.columns,
            filters: state.filters,
            data: state.data,
            orderBy: state.orderBy,
            limit: state.limit,
          });
          return normalizeResult(result);
        };

        const chain: any = {
          eq: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'eq', value }],
            }),
          neq: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'neq', value }],
            }),
          in: (column: string, values: any[]) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'in', value: values }],
            }),
          is: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'is', value }],
            }),
          gte: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'gte', value }],
            }),
          lte: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'lte', value }],
            }),
          gt: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'gt', value }],
            }),
          lt: (column: string, value: any) =>
            createQuery(action, {
              ...state,
              filters: [...state.filters, { column, operator: 'lt', value }],
            }),
          order: (column: string, options?: { ascending?: boolean }) =>
            createQuery(action, {
              ...state,
              orderBy: { column, ascending: options?.ascending ?? true },
            }),
          limit: (count: number) =>
            createQuery(action, {
              ...state,
              limit: count,
            }),
          select: (columns?: string) =>
            createQuery('select', {
              ...state,
              columns,
            }),
          execute,
          then: (resolve: any, reject: any) => execute().then(resolve, reject),
          single: () =>
            asExecutable(async () => {
              const result = await execute();
              if (result.error) return result;
              const rows = Array.isArray(result.data) ? result.data : [];
              if (rows.length === 0) {
                return { data: null, error: { message: 'No rows returned' } };
              }
              if (rows.length > 1) {
                return { data: rows[0], error: { message: 'Multiple rows returned' } };
              }
              return { data: rows[0], error: null };
            }),
          maybeSingle: () =>
            asExecutable(async () => {
              const result = await execute();
              if (result.error) return result;
              const rows = Array.isArray(result.data) ? result.data : [];
              if (rows.length === 0) return { data: null, error: null };
              if (rows.length > 1) {
                return { data: rows[0], error: { message: 'Multiple rows returned' } };
              }
              return { data: rows[0], error: null };
            }),
        };

        return chain;
      };

      const createInsertQuery = (data: any) => {
        const execute = async () => {
          const result = await electronAPI.sqliteQuery?.({
            table,
            action: 'insert',
            data,
            returnData: true
          });
          return normalizeResult(result);
        };

        const chain: any = {
          execute,
          then: (resolve: any, reject: any) => execute().then(resolve, reject),
          select: (columns?: string) => {
            const selectChain: any = {
              execute,
              then: (resolve: any, reject: any) => execute().then(resolve, reject),
              single: () =>
                asExecutable(async () => {
                  const result = await execute();
                  const insertedData = Array.isArray(result.data) ? result.data[0] : result.data;
                  return { data: insertedData || null, error: result.error || null };
                }),
            };
            return selectChain;
          },
          single: () =>
            asExecutable(async () => {
              const result = await execute();
              const insertedData = Array.isArray(result.data) ? result.data[0] : result.data;
              return { data: insertedData || null, error: result.error || null };
            }),
        };

        return chain;
      };

      const createUpsertQuery = (data: any, options?: { onConflict?: string }) => {
        const execute = async () => {
          const result = await electronAPI.sqliteQuery?.({
            table,
            action: 'upsert',
            data,
            onConflict: options?.onConflict,
            returnData: true
          });
          return normalizeResult(result);
        };

        const chain: any = {
          execute,
          then: (resolve: any, reject: any) => execute().then(resolve, reject),
          select: () => ({
            execute,
            then: (resolve: any, reject: any) => execute().then(resolve, reject),
            single: () =>
              asExecutable(async () => {
                const result = await execute();
                const upsertedData = Array.isArray(result.data) ? result.data[0] : result.data;
                return { data: upsertedData || null, error: result.error || null };
              }),
          }),
          single: () =>
            asExecutable(async () => {
              const result = await execute();
              const upsertedData = Array.isArray(result.data) ? result.data[0] : result.data;
              return { data: upsertedData || null, error: result.error || null };
            }),
        };

        return chain;
      };

      return {
        select: (columns?: string) => createQuery('select', { columns }),
        insert: createInsertQuery,
        upsert: createUpsertQuery,
        update: (data: any) => createQuery('update', { data }),
        delete: () => createQuery('delete'),
      };
    },
    login: async (email: string, password: string) => {
      const result = await electronAPI.sqliteAuth?.({ action: 'login', email, password });
      return { data: result?.data || null, error: result?.error || null };
    },
    signup: async (email: string, password: string, fullName: string) => {
      const result = await electronAPI.sqliteAuth?.({ action: 'signup', email, password, fullName });
      return { data: result?.data || null, error: result?.error || null };
    },
    logout: () => {
      electronAPI.sqliteAuth?.({ action: 'logout' });
    },
    getCurrentUser: () => {
      return electronAPI.sqliteGetCurrentUser?.() || null;
    }
  };
}

/**
 * Get Access Control instance (via IPC)
 */
export function getAccessControl(): any {
  // Access control is handled in the main process
  // This is a placeholder for compatibility
  return {
    check: async (action: string, resource: string, userId?: string) => {
      const electronAPI = (window as any).electronAPI;
      const result = await electronAPI.sqliteAccessControl?.({ action, resource, userId });
      return result?.allowed || false;
    }
  };
}

/**
 * SQLite client with Supabase-compatible API
 */
export const sqlite = getSQLiteClient();

/**
 * Auth helper (replaces supabase.auth)
 */
export const auth = {
  /**
   * Sign in with email and password
   */
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const db = getSQLiteClient();
    const result = await db.login(email, password);
    
    if (result.error) {
      return {
        data: { user: null, session: null },
        error: result.error
      };
    }
    
    // Create session-like object for compatibility
    return {
      data: {
        user: result.data,
        session: {
          user: result.data,
          access_token: 'local-session',
          refresh_token: 'local-session'
        }
      },
      error: null
    };
  },

  /**
   * Sign up with email and password
   */
  signUp: async ({ email, password, options }: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string } }
  }) => {
    const db = getSQLiteClient();
    const fullName = options?.data?.full_name || email.split('@')[0];
    const result = await db.signup(email, password, fullName);
    
    if (result.error) {
      return {
        data: { user: null, session: null },
        error: result.error
      };
    }
    
    return {
      data: {
        user: result.data,
        session: {
          user: result.data,
          access_token: 'local-session',
          refresh_token: 'local-session'
        }
      },
      error: null
    };
  },

  /**
   * Sign out
   */
  signOut: async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.sqliteAuth) {
      await electronAPI.sqliteAuth({ action: 'logout' });
    }
    return { error: null };
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const db = getSQLiteClient();
    const user = await db.getCurrentUser();
    
    if (!user) {
      return { data: { session: null }, error: null };
    }
    
    return {
      data: {
        session: {
          user,
          access_token: 'local-session',
          refresh_token: 'local-session'
        }
      },
      error: null
    };
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const db = getSQLiteClient();
    const user = await db.getCurrentUser();
    
    return {
      data: { user },
      error: null
    };
  },

  /**
   * Auth state change listener (compatibility)
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // For SQLite, we don't have real-time auth changes
    // Call the callback asynchronously to get initial state
    const db = getSQLiteClient();
    
    // Get current user asynchronously (IPC call returns a Promise)
    const userPromise = db.getCurrentUser();
    
    // Check if it's actually a Promise (IPC call)
    if (userPromise && typeof userPromise.then === 'function') {
      userPromise.then((user: any) => {
        if (user) {
          callback('SIGNED_IN', {
            user,
            access_token: 'local-session'
          });
        } else {
          callback('SIGNED_OUT', null);
        }
      }).catch((error: any) => {
        console.error('Error getting current user:', error);
        callback('SIGNED_OUT', null);
      });
    } else {
      // Fallback for synchronous case (shouldn't happen with IPC)
      const user = userPromise;
      if (user) {
        callback('SIGNED_IN', {
          user,
          access_token: 'local-session'
        });
      } else {
        callback('SIGNED_OUT', null);
      }
    }
    
    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  },

  /**
   * Update user
   */
  updateUser: async ({ data }: { data: any }) => {
    const db = getSQLiteClient();
    const user = db.getCurrentUser();
    
    if (!user) {
      return { data: { user: null }, error: new Error('Not authenticated') };
    }
    
    const result = await db.from('profiles').update(data).eq('id', user.id).execute();
    
    if (result.error) {
      return { data: { user: null }, error: result.error };
    }
    
    return { data: { user: result.data[0] }, error: null };
  }
};

/**
 * Storage helper (replaces supabase.storage)
 */
export const storage = {
  from: (bucket: string) => ({
    /**
     * Upload file to local storage
     */
    upload: async (path: string, file: File | Blob, options?: any) => {
      try {
        // In Electron, save to userData/files directory
        const arrayBuffer = await file.arrayBuffer();
        const filePath = await (window as any).electronAPI?.saveFile?.({
          bucket,
          path,
          buffer: arrayBuffer,
          mimeType: file.type || options?.contentType || null,
        });
        
        if (!filePath) {
          throw new Error('File save not implemented');
        }
        
        return {
          data: { path: filePath },
          error: null
        };
      } catch (error) {
        return {
          data: null,
          error: error as Error
        };
      }
    },

    /**
     * Get public URL (local file path)
     */
    getPublicUrl: async (path: string) => {
      const publicPath = await (window as any).electronAPI?.getFilePath?.(bucket, path) || path;
      return {
        data: { publicUrl: publicPath }
      };
    },

    /**
     * Download file
     */
    download: async (path: string) => {
      const result = await (window as any).electronAPI?.downloadFile?.(bucket, path);
      const data = result?.buffer
        ? new Blob([result.buffer], { type: result.mimeType || 'application/octet-stream' })
        : null;
      return {
        data,
        error: data ? null : new Error('File not found')
      };
    },

    /**
     * Delete file
     */
    remove: async (paths: string[]) => {
      for (const path of paths) {
        await (window as any).electronAPI?.deleteFile?.(bucket, path);
      }
      return { data: null, error: null };
    }
  })
};

/**
 * Export default client (replaces default supabase export)
 */
export default getSQLiteClient();

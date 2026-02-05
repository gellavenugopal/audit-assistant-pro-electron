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
      // Helper to build query chain
      const buildSelectChain = (columns?: string, filters: any[] = [], orderBy?: { column: string; ascending: boolean }, limit?: number) => ({
        eq: (column: string, value: any) => buildSelectChain(columns, [...filters, { column, value }], orderBy, limit),
        order: (column: string, options?: { ascending?: boolean }) => 
          buildSelectChain(columns, filters, { column, ascending: options?.ascending ?? true }, limit),
        limit: (count: number) => buildSelectChain(columns, filters, orderBy, count),
        execute: async () => {
          const result = await electronAPI.sqliteQuery?.({
            table,
            action: 'select',
            columns,
            filters,
            orderBy,
            limit
          });
          return { data: result?.data || [], error: result?.error || null };
        },
        single: () => ({
          execute: async () => {
            const result = await electronAPI.sqliteQuery?.({
              table,
              action: 'select',
              columns,
              filters,
              orderBy,
              limit
            });
            const data = result?.data?.[0] || null;
            return { data, error: result?.error || null };
          }
        })
      });

      return {
        select: (columns?: string) => buildSelectChain(columns),
        insert: (data: any) => {
          const insertChain = {
            select: (columns?: string) => ({
              single: () => ({
                execute: async () => {
                  const result = await electronAPI.sqliteQuery?.({
                    table,
                    action: 'insert',
                    data,
                    returnData: true
                  });
                  // If result.data is an array, return first item, otherwise return the data
                  const insertedData = Array.isArray(result?.data) ? result?.data[0] : result?.data;
                  return { data: insertedData || null, error: result?.error || null };
                }
              }),
              execute: async () => {
                const result = await electronAPI.sqliteQuery?.({
                  table,
                  action: 'insert',
                  data,
                  returnData: true
                });
                return { data: result?.data || null, error: result?.error || null };
              }
            }),
            single: () => ({
              execute: async () => {
                const result = await electronAPI.sqliteQuery?.({
                  table,
                  action: 'insert',
                  data,
                  returnData: true
                });
                const insertedData = Array.isArray(result?.data) ? result?.data[0] : result?.data;
                return { data: insertedData || null, error: result?.error || null };
              }
            }),
            execute: async () => {
              const result = await electronAPI.sqliteQuery?.({
                table,
                action: 'insert',
                data,
                returnData: true
              });
              return { data: result?.data || null, error: result?.error || null };
            }
          };
          return insertChain;
        },
        update: (data: any) => ({
          eq: (column: string, value: any) => ({
            execute: async () => {
              const result = await electronAPI.sqliteQuery?.({
                table,
                action: 'update',
                data,
                filters: [{ column, value }]
              });
              return { data: result?.data || null, error: result?.error || null };
            }
          })
        }),
        delete: () => ({
          eq: (column: string, value: any) => ({
            execute: async () => {
              const result = await electronAPI.sqliteQuery?.({
                table,
                action: 'delete',
                filters: [{ column, value }]
              });
              return { data: result?.data || null, error: result?.error || null };
            }
          })
        })
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
    
    const result = await db.from('profiles').eq('id', user.id).update(data).execute();
    
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
        const filePath = (window as any).electronAPI?.saveFile?.(bucket, path, file);
        
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
    getPublicUrl: (path: string) => {
      const publicPath = (window as any).electronAPI?.getFilePath?.(bucket, path) || path;
      return {
        data: { publicUrl: publicPath }
      };
    },

    /**
     * Download file
     */
    download: async (path: string) => {
      const data = await (window as any).electronAPI?.downloadFile?.(bucket, path);
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

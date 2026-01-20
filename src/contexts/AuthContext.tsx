import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSQLiteClient, auth as sqliteAuth } from '@/integrations/sqlite/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const db = getSQLiteClient();
      
      // Fetch profile
      const { data: profileData } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role
      const { data: roleData } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (roleData) {
        setRole(roleData.role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthContext: Initializing...');
    let subscription: any = null;

    const initAuth = async () => {
      try {
        // Always start in signed-out state so login/signup shows on app load.
        // This disables any implicit session restoration.
        console.log('🔓 Clearing any existing session on startup...');
        await sqliteAuth.signOut();
        console.log('✅ Session cleared');
        
        // Set up auth state listener AFTER signOut completes
        const { data: { subscription: sub } } = sqliteAuth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 Auth state changed:', event, !!session);
            setSession(session);
            setUser(session?.user ?? null);
            
            // Defer data fetching to avoid deadlock
            if (session?.user) {
              setTimeout(() => {
                fetchUserData(session.user.id);
              }, 0);
            } else {
              setProfile(null);
              setRole(null);
            }
            
            setLoading(false);
          }
        );
        
        subscription = sub;

        // Check for existing session (should be null after signOut)
        const { data: { session }, error } = await sqliteAuth.getSession();
        console.log('📦 Initial session check:', !!session, error);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to initialize auth:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await sqliteAuth.signInWithPassword({
      email,
      password,
    });
    
    // Update state immediately on successful login
    if (!error && data.user && data.session) {
      console.log('✅ Login successful, updating auth state...');
      setUser(data.user);
      setSession(data.session);
      
      // Fetch user data
      await fetchUserData(data.user.id);
      
      // Log successful login
      const db = getSQLiteClient();
      setTimeout(async () => {
        const { data: profileData } = await db
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .single();
        
        if (profileData) {
          await db.from('activity_logs').insert({
            user_id: data.user.id,
            user_name: profileData.full_name,
            action: 'Signed In',
            entity: 'Auth',
            engagement_id: null,
            details: `User logged in`,
          }).execute();
        }
      }, 0);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await sqliteAuth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Update state immediately on successful signup and auto-login
    if (!error && data.user && data.session) {
      console.log('✅ Signup successful, updating auth state...');
      setUser(data.user);
      setSession(data.session);
      
      // Fetch user data
      await fetchUserData(data.user.id);
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('🔓 Signing out...');
    await sqliteAuth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

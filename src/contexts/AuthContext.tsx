import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Call with a captcha token to sign in anonymously */
  signInAnonymous: (captchaToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signInAnonymous: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session — if none, stop loading (don't auto sign-in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymous = useCallback(async (captchaToken: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously({
      options: { captchaToken },
    });
    if (error) {
      console.error('Anonymous auth failed:', error);
      setLoading(false);
      throw error;
    }
    // onAuthStateChange will handle setting user/session/loading
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

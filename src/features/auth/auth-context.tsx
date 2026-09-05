import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getPublicEnvIssue } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

type SignUpValues = {
  displayName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  configIssue: string | null;
  initialized: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    values: SignUpValues,
    emailRedirectTo?: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configIssue = getPublicEnvIssue();
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (configIssue) {
      return;
    }

    const supabase = getSupabase();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setInitialized(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitialized(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configIssue]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (
      { displayName, email, password }: SignUpValues,
      emailRedirectTo?: string,
    ) => {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });
      if (error) throw error;
      return { needsEmailConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      configIssue,
      initialized: initialized || Boolean(configIssue),
      session,
      signIn,
      signOut,
      signUp,
    }),
    [configIssue, initialized, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

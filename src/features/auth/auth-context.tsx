import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  initializationError: string | null;
  initialized: boolean;
  retrySessionInitialization: () => Promise<void>;
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
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const sessionRequestGeneration = useRef(0);

  const initializeSession = useCallback(async () => {
    if (configIssue) return;

    const generation = ++sessionRequestGeneration.current;
    setInitialized(false);
    setInitializationError(null);
    try {
      const { data, error } = await getSupabase().auth.getSession();
      if (error) throw error;
      if (generation !== sessionRequestGeneration.current) return;
      setSession(data.session);
    } catch (error) {
      if (generation !== sessionRequestGeneration.current) return;
      setSession(null);
      setInitializationError(
        error instanceof Error
          ? error.message
          : 'Не вдалося відновити сесію. Перевірте з’єднання й повторіть.',
      );
    } finally {
      if (generation === sessionRequestGeneration.current) {
        setInitialized(true);
      }
    }
  }, [configIssue]);

  useEffect(() => {
    if (configIssue) {
      return;
    }

    const supabase = getSupabase();
    let active = true;
    const timer = window.setTimeout(() => {
      void initializeSession();
    }, 0);

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      sessionRequestGeneration.current += 1;
      setSession(nextSession);
      setInitializationError(null);
      setInitialized(true);
    });

    return () => {
      active = false;
      sessionRequestGeneration.current += 1;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [configIssue, initializeSession]);

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
      initializationError,
      initialized: initialized || Boolean(configIssue),
      retrySessionInitialization: initializeSession,
      session,
      signIn,
      signOut,
      signUp,
    }),
    [
      configIssue,
      initializationError,
      initialized,
      initializeSession,
      session,
      signIn,
      signOut,
      signUp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

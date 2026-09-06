import { act, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  stateCallback: null as
    ((event: string, session: Session | null) => void) | null,
  unsubscribe: vi.fn(),
}));

vi.mock('@/lib/env', () => ({ getPublicEnvIssue: () => null }));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: auth.getSession,
      onAuthStateChange: auth.onAuthStateChange,
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}));

import { AuthProvider, useAuth } from './auth-context';

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function session(accessToken: string) {
  return { access_token: accessToken } as Session;
}

function AuthProbe() {
  const {
    initialized,
    retrySessionInitialization,
    session: currentSession,
  } = useAuth();

  return (
    <>
      <output>{currentSession?.access_token ?? 'none'}</output>
      <output>{initialized ? 'ready' : 'loading'}</output>
      <button onClick={() => void retrySessionInitialization()} type="button">
        retry
      </button>
    </>
  );
}

describe('AuthProvider session initialization', () => {
  beforeEach(() => {
    auth.getSession.mockReset();
    auth.onAuthStateChange.mockReset();
    auth.unsubscribe.mockReset();
    auth.stateCallback = null;
    auth.onAuthStateChange.mockImplementation((callback) => {
      auth.stateCallback = callback;
      return {
        data: { subscription: { unsubscribe: auth.unsubscribe } },
      };
    });
  });

  it('keeps the newer retry result when an older request resolves last', async () => {
    const first = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    const second = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    auth.getSession
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(1));
    await act(async () =>
      screen.getByRole('button', { name: 'retry' }).click(),
    );
    expect(auth.getSession).toHaveBeenCalledTimes(2);

    await act(async () =>
      second.resolve({ data: { session: session('new') }, error: null }),
    );
    expect(screen.getByText('new')).toBeInTheDocument();

    await act(async () =>
      first.resolve({ data: { session: session('old') }, error: null }),
    );
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('ignores a pending session result after unmount', async () => {
    const pending = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    auth.getSession.mockReturnValue(pending.promise);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { unmount } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () =>
      pending.resolve({ data: { session: session('late') }, error: null }),
    );

    expect(auth.unsubscribe).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('keeps an auth-state event when an earlier initialization resolves later', async () => {
    const pending = deferred<{
      data: { session: Session | null };
      error: null;
    }>();
    auth.getSession.mockReturnValue(pending.promise);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(auth.getSession).toHaveBeenCalledTimes(1));
    act(() => auth.stateCallback?.('SIGNED_IN', session('event')));
    expect(screen.getByText('event')).toBeInTheDocument();

    await act(async () =>
      pending.resolve({ data: { session: session('late') }, error: null }),
    );
    expect(screen.queryByText('late')).not.toBeInTheDocument();
    expect(screen.getByText('event')).toBeInTheDocument();
  });
});

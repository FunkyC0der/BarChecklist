import { MotionConfig } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/features/auth/auth-context';
import { TeamProvider } from '@/features/teams/team-context';
import { createQueryClient } from '@/lib/query-client';

import { AppLayout } from './routes/app-layout';
import { RequireAuth, RequireGuest, SessionGate } from './routes/guards';

/** The app's provider stack and guard/shell wrappers. Kept apart from
 * app-router.tsx so that module can export its router factory without
 * mixing component and non-component exports (react-refresh). Provider
 * order here is the app's real order. */
const queryClient = createQueryClient();
export function Root() {
  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <TeamProvider>
                <SessionGate>
                  <Outlet />
                </SessionGate>
              </TeamProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </MotionConfig>
    </AppErrorBoundary>
  );
}
export function Guest({ children }: { children: ReactNode }) {
  return <RequireGuest>{children}</RequireGuest>;
}
export function Authenticated({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
export function Shell({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

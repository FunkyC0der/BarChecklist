import { BrowserRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '@/features/auth/auth-context';
import { TeamProvider } from '@/features/teams/team-context';

import { AppLayout } from './routes/app-layout';
import { ChecklistsRoute } from './routes/checklists';
import { RequireAuth, RequireGuest, SessionGate } from './routes/guards';
import { HistoryRoute } from './routes/history';
import { IndexRoute } from './routes/index';
import { JoinRoute } from './routes/join';
import { OnboardingRoute } from './routes/onboarding';
import { SignInRoute } from './routes/sign-in';
import { SignUpRoute } from './routes/sign-up';
import { TeamRoute } from './routes/team';
import { TodayRoute } from './routes/today';
import { UiKitRoute } from './routes/ui-kit';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <SessionGate>
            <Routes>
              <Route element={<IndexRoute />} path="/" />
              <Route element={<RequireGuest />}>
                <Route element={<SignInRoute />} path="/sign-in" />
                <Route element={<SignUpRoute />} path="/sign-up" />
              </Route>
              <Route element={<JoinRoute />} path="/join/:token" />
              <Route element={<UiKitRoute />} path="/ui-kit" />
              <Route element={<RequireAuth />}>
                <Route element={<OnboardingRoute />} path="/onboarding" />
                <Route element={<AppLayout />}>
                  <Route element={<TodayRoute />} path="/today" />
                  <Route element={<ChecklistsRoute />} path="/checklists" />
                  <Route element={<HistoryRoute />} path="/history" />
                  <Route element={<TeamRoute />} path="/team" />
                </Route>
              </Route>
            </Routes>
          </SessionGate>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

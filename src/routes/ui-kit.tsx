import { Navigate } from '@/lib/router';

import { ThemeShowcase } from '@/components/common/theme-showcase';
import { Screen } from '@/components/ui';

export function UiKitRoute() {
  if (!import.meta.env.DEV && import.meta.env.VITE_UI_KIT !== 'true') {
    return <Navigate replace to="/" />;
  }

  return (
    <Screen>
      <ThemeShowcase />
    </Screen>
  );
}

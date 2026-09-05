import { Redirect } from 'expo-router';

import { ThemeShowcase } from '@/components/common/theme-showcase';
import { Screen } from '@/components/ui';

export default function UiKitScreen() {
  // This opt-in is only for local visual regression builds. Normal production
  // exports still redirect away from the internal component gallery.
  if (!__DEV__ && process.env.EXPO_PUBLIC_UI_KIT !== 'true') {
    return <Redirect href="/" />;
  }

  return (
    <Screen>
      <ThemeShowcase />
    </Screen>
  );
}

import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading, Screen } from '@/components/ui';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { TeamProvider } from '@/features/teams/team-context';

function RootNavigator() {
  const { initialized, session } = useAuth();

  if (!initialized) {
    return (
      <Screen scroll={false}>
        <Loading label="Відновлюємо сесію…" size="large" />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
      <Stack.Screen name="join/[token]" />
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TeamProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </TeamProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

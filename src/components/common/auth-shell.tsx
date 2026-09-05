import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';

type AuthShellProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function AuthShell({
  children,
  description,
  footer,
  title,
}: AuthShellProps) {
  return (
    <Screen>
      <View className="mx-auto w-full max-w-md flex-1 justify-center gap-6 py-8">
        <View className="gap-2">
          <AppText variant="title">Bar Checklist</AppText>
          <AppText tone="muted">
            Щоденні чеклісти команди без зайвого шуму.
          </AppText>
        </View>
        <Card description={description} title={title}>
          {children}
        </Card>
        <View className="items-center">{footer}</View>
      </View>
    </Screen>
  );
}

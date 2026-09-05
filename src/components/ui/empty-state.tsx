import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="items-center py-12">
      <View className="max-w-lg items-center gap-2">
        <AppText className="text-center" variant="heading">
          {title}
        </AppText>
        <AppText className="text-center" tone="muted">
          {description}
        </AppText>
      </View>
      {action}
    </Card>
  );
}

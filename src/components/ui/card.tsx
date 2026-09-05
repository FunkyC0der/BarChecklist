import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from './app-text';

export type CardProps = ComponentProps<typeof View> & {
  children: ReactNode;
  description?: string;
  title?: string;
};

export function Card({
  children,
  className = '',
  description,
  title,
  ...props
}: CardProps) {
  return (
    <View
      className={`gap-4 rounded-box border border-base-300 bg-base-100 p-6 shadow-cupcake ${className}`}
      {...props}
    >
      {title || description ? (
        <View className="gap-1">
          {title ? <AppText variant="heading">{title}</AppText> : null}
          {description ? <AppText tone="muted">{description}</AppText> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

import { ActivityIndicator, View } from 'react-native';

import { theme } from '@/constants/theme';

import { AppText } from './app-text';

type LoadingProps = {
  label?: string;
  size?: 'small' | 'large';
};

function rgb(token: keyof typeof theme.colors) {
  return `rgb(${theme.colors[token].rgb})`;
}

export function Loading({
  label = 'Завантаження…',
  size = 'small',
}: LoadingProps) {
  return (
    <View
      className="flex-row items-center justify-center gap-3"
      accessibilityRole="progressbar"
    >
      <ActivityIndicator color={rgb('primary-content')} size={size} />
      {label ? <AppText tone="muted">{label}</AppText> : null}
    </View>
  );
}

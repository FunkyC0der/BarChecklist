import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';
import { Loading } from './loading';

type ButtonTone = 'default' | 'primary' | 'secondary' | 'error' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

const containerClasses: Record<ButtonTone, string> = {
  default: 'border-neutral bg-neutral',
  primary: 'border-primary bg-primary',
  secondary: 'border-secondary bg-secondary',
  error: 'border-error bg-error',
  ghost: 'border-transparent bg-transparent',
};

const textClasses: Record<ButtonTone, string> = {
  default: 'text-neutral-content',
  primary: 'text-primary-content',
  secondary: 'text-secondary-content',
  error: 'text-error-content',
  ghost: 'text-base-content',
};

const sizeClasses: Record<ButtonSize, string> = {
  small: 'min-h-10 px-4',
  medium: 'min-h-12 px-6',
  large: 'min-h-14 px-8',
};

export type ButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  tone?: ButtonTone;
};

export function Button({
  children,
  className = '',
  disabled = false,
  loading = false,
  size = 'medium',
  tone = 'default',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      className={`${sizeClasses[size]} ${containerClasses[tone]} items-center justify-center rounded-field border shadow-cupcake active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${className}`}
      disabled={isDisabled}
      {...props}
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? <Loading label="" /> : null}
        <AppText className={`font-bold ${textClasses[tone]}`}>
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}

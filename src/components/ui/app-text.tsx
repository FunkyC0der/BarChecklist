import type { ComponentProps } from 'react';
import { Text } from 'react-native';

type TextVariant = 'body' | 'caption' | 'heading' | 'label' | 'title';
type TextTone = 'default' | 'muted' | 'error' | 'success';

const variantClasses: Record<TextVariant, string> = {
  body: 'text-base leading-6',
  caption: 'text-sm leading-5',
  heading: 'text-2xl font-bold leading-8',
  label: 'text-sm font-semibold leading-5',
  title: 'text-4xl font-bold leading-tight',
};

const toneClasses: Record<TextTone, string> = {
  default: 'text-base-content',
  muted: 'text-base-content/60',
  error: 'text-error',
  success: 'text-success-content',
};

export type AppTextProps = ComponentProps<typeof Text> & {
  variant?: TextVariant;
  tone?: TextTone;
};

export function AppText({
  className = '',
  variant = 'body',
  tone = 'default',
  ...props
}: AppTextProps) {
  return (
    <Text
      className={`${variantClasses[variant]} ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}

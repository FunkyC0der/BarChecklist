import { forwardRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { TextInput, View } from 'react-native';

import { AppText } from './app-text';

export type InputProps = ComponentProps<typeof TextInput> & {
  error?: string | undefined;
  helperText?: string | undefined;
  label: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    className = '',
    editable = true,
    error,
    helperText,
    label,
    onBlur,
    onFocus,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        className={`min-h-12 rounded-field border bg-base-100 px-5 py-3 text-base text-base-content outline-none placeholder:text-base-content/40 disabled:opacity-50 ${
          error
            ? 'border-error'
            : focused
              ? 'border-primary-content'
              : 'border-base-300'
        } ${className}`}
        editable={editable}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor="rgb(41 19 52 / 0.4)"
        {...props}
      />
      {error ? (
        <AppText
          accessibilityLiveRegion="polite"
          tone="error"
          variant="caption"
        >
          {error}
        </AppText>
      ) : helperText ? (
        <AppText tone="muted" variant="caption">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

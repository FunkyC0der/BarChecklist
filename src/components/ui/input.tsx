import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type InputProps = {
  error?: string | undefined;
  helperText?: string | undefined;
  label: string;
  onChangeText?: ((value: string) => void) | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>;

export function Input({
  className,
  error,
  helperText,
  id,
  label,
  onChangeText,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const message = error ?? helperText;

  return (
    <fieldset className="fieldset p-0">
      <legend className="fieldset-legend">{label}</legend>
      <input
        className={cn('input w-full', error && 'input-error', className)}
        id={inputId}
        onChange={
          onChangeText ? (event) => onChangeText(event.target.value) : undefined
        }
        {...props}
      />
      {message ? (
        <p className={cn('label', error && 'text-error')}>{message}</p>
      ) : null}
    </fieldset>
  );
}

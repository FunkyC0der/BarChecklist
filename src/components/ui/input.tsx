import { useId } from 'react';
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
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId.replaceAll(':', '')}`;
  const messageId = `${inputId}-message`;
  const message = error ?? helperText;

  return (
    <fieldset className="fieldset p-0">
      <label className="fieldset-legend" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={message ? messageId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn('input w-full', error && 'input-error', className)}
        id={inputId}
        onChange={
          onChangeText ? (event) => onChangeText(event.target.value) : undefined
        }
        {...props}
      />
      {message ? (
        <p className={cn('label', error && 'text-error')} id={messageId}>
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}

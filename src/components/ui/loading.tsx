import { cn } from '@/lib/cn';

const sizes = {
  lg: 'loading-lg',
  md: 'loading-md',
  sm: 'loading-sm',
} as const;

export function Loading({
  label,
  size = 'md',
}: {
  label?: string | undefined;
  size?: keyof typeof sizes;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
      <span
        aria-label={label ?? 'Завантаження'}
        className={cn('loading loading-spinner', sizes[size])}
      />
      {label ? <p className="text-base-content/60">{label}</p> : null}
    </div>
  );
}

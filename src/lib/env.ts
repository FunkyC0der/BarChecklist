import { z } from 'zod';

const envSchema = z
  .object({
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    VITE_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  })
  .refine(
    (value) =>
      value.VITE_SUPABASE_PUBLISHABLE_KEY || value.VITE_SUPABASE_ANON_KEY,
    {
      message:
        'Додайте VITE_SUPABASE_PUBLISHABLE_KEY (або тимчасовий ANON_KEY).',
    },
  );

export type PublicEnv = z.infer<typeof envSchema>;

function readRawEnv() {
  return {
    VITE_SUPABASE_URL:
      import.meta.env.VITE_SUPABASE_URL ??
      import.meta.env.EXPO_PUBLIC_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      import.meta.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY:
      import.meta.env.VITE_SUPABASE_ANON_KEY ??
      import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function readPublicEnv(): PublicEnv {
  return envSchema.parse(readRawEnv());
}

export function getPublicEnvIssue(): string | null {
  const result = envSchema.safeParse(readRawEnv());

  return result.success
    ? null
    : (result.error.issues[0]?.message ?? 'Некоректна конфігурація Supabase.');
}

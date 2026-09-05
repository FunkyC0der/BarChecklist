import { z } from 'zod';

const envSchema = z
  .object({
    EXPO_PUBLIC_SUPABASE_URL: z.url(),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  })
  .refine(
    (value) =>
      value.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      value.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
      message:
        'Додайте EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (або тимчасовий ANON_KEY).',
    },
  );

export type PublicEnv = z.infer<typeof envSchema>;

export function readPublicEnv(): PublicEnv {
  return envSchema.parse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getPublicEnvIssue(): string | null {
  const result = envSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  return result.success
    ? null
    : (result.error.issues[0]?.message ?? 'Некоректна конфігурація Supabase.');
}

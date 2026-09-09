import { ZodError } from 'zod';

export type ErrorKind = 'postgrest' | 'auth' | 'zod' | 'network' | 'unknown';

export type NormalizedError = {
  kind: ErrorKind;
  name: string;
  message: string;
  code?: string | undefined;
  details?: string | undefined;
  hint?: string | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPostgrestError(value: Record<string, unknown>): value is Record<
  string,
  unknown
> & {
  code: string;
  details: string | null;
  hint: string | null;
  message: string;
} {
  return (
    'code' in value &&
    'details' in value &&
    'hint' in value &&
    'message' in value
  );
}

function isAuthError(value: Record<string, unknown>) {
  return value.__isAuthError === true;
}

/** PostgrestError/AuthError/ZodError/network → one shape logging can rely on.
 * Never surfaces raw error.message for ZodError: that's the schema's field
 * path, not something safe to show a user or send to the log sink. */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ZodError) {
    return {
      kind: 'zod',
      name: 'ZodError',
      message: 'Дані не відповідають очікуваній формі.',
      details: error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}:${issue.code}`)
        .join(', '),
    };
  }

  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return { kind: 'network', name: error.name, message: error.message };
  }

  if (isRecord(error) && isAuthError(error)) {
    return {
      kind: 'auth',
      name: typeof error.name === 'string' ? error.name : 'AuthError',
      message: typeof error.message === 'string' ? error.message : '',
      code: typeof error.code === 'string' ? error.code : undefined,
    };
  }

  if (isRecord(error) && isPostgrestError(error)) {
    return {
      kind: 'postgrest',
      name: 'PostgrestError',
      message: error.message,
      code: error.code,
      details: error.details ?? undefined,
      hint: error.hint ?? undefined,
    };
  }

  if (
    isRecord(error) &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return {
      kind: 'unknown',
      name: typeof error.name === 'string' ? error.name : 'UnknownError',
      message: error.message,
      code: typeof error.code === 'string' ? error.code : undefined,
    };
  }

  if (error instanceof Error) {
    return { kind: 'unknown', name: error.name, message: error.message };
  }

  if (typeof error === 'string' && error.trim()) {
    return { kind: 'unknown', name: 'UnknownError', message: error };
  }

  return { kind: 'unknown', name: 'UnknownError', message: '' };
}

/** The one place in the codebase allowed to inspect an error's shape rather
 * than its message — RLS denials (SQLSTATE 42501) drive UI branching. Checks
 * the raw `code` field directly (not the stricter PostgrestError shape
 * normalizeError requires) so it still matches a bare `{ code: '42501' }`
 * as thrown by, e.g., a mocked Supabase rejection in tests. */
export function isPermissionError(error: unknown): boolean {
  return isRecord(error) && error.code === '42501';
}

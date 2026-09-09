import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { isPermissionError, normalizeError } from './log-error';

describe('normalizeError', () => {
  it('classifies a PostgrestError-shaped object', () => {
    const result = normalizeError({
      code: '23514',
      details: 'Check constraint violated',
      hint: null,
      message: 'The task is not scheduled for the current logical date.',
    });
    expect(result).toMatchObject({
      code: '23514',
      details: 'Check constraint violated',
      kind: 'postgrest',
      message: 'The task is not scheduled for the current logical date.',
    });
  });

  it('classifies a ZodError without leaking raw issue values', () => {
    const schema = z.object({ id: z.string() });
    const parsed = schema.safeParse({ id: 42 });
    if (parsed.success) throw new Error('expected parse failure');

    const result = normalizeError(parsed.error);
    expect(result.kind).toBe('zod');
    expect(result.message).not.toContain('42');
    expect(result.details).toContain('id:');
  });

  it('classifies a fetch TypeError as a network error', () => {
    const result = normalizeError(new TypeError('Failed to fetch'));
    expect(result.kind).toBe('network');
  });

  it('falls back to an empty message for values with no message', () => {
    expect(normalizeError(null).message).toBe('');
    expect(normalizeError(undefined).message).toBe('');
  });
});

describe('isPermissionError', () => {
  it('matches SQLSTATE 42501 regardless of the error shape', () => {
    expect(isPermissionError({ code: '42501' })).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isPermissionError({ code: '22023' })).toBe(false);
    expect(isPermissionError(new Error('boom'))).toBe(false);
    expect(isPermissionError(null)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('reads standard Error messages', () => {
    expect(getErrorMessage(new Error('Database unavailable'), 'Fallback')).toBe(
      'Database unavailable',
    );
  });

  it('reads Supabase-style plain error objects', () => {
    expect(
      getErrorMessage(
        { code: '42501', message: 'permission denied' },
        'Fallback',
      ),
    ).toBe('permission denied');
  });

  it('falls back safely for unknown values', () => {
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});

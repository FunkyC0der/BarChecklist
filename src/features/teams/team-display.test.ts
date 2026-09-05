import { describe, expect, it } from 'vitest';

import { initials } from './team-display';

describe('initials', () => {
  it('returns up to two uppercase letters from name words', () => {
    expect(initials('Олена')).toBe('О');
    expect(initials('Іван Петренко')).toBe('ІП');
    expect(initials('  foo bar baz  ')).toBe('FB');
    expect(initials('')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-client';

describe('queryKeys', () => {
  it('scopes Today cache entries by both team and logical date', () => {
    expect(queryKeys.today('team-a', '2026-09-08')).toEqual([
      'today',
      'team-a',
      '2026-09-08',
    ]);
    expect(queryKeys.today('team-a', '2026-09-09')).not.toEqual(
      queryKeys.today('team-a', '2026-09-08'),
    );
  });

  it('exposes team-scoped prefixes for cross-screen invalidation', () => {
    expect(queryKeys.todayForTeam('team-a')).toEqual(['today', 'team-a']);
    expect(queryKeys.historyForTeam('team-a')).toEqual(['history', 'team-a']);
  });
});

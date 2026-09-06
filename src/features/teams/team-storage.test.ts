import { describe, expect, it } from 'vitest';

import type { Team } from './team-api';
import { isInviteToken, joinPath, safeJoinReturnPath } from './team-routes';
import { resolveActiveTeamId } from './team-storage';
import {
  isTeamTabPath,
  resolveActiveTeamTab,
  resolveTeamTabRoot,
} from './team-tab-storage';

const teams: Team[] = [
  {
    created_at: '2026-09-04T10:00:00.000Z',
    id: 'team-first',
    name: 'First',
    owner_id: 'user-1',
    timezone: 'Europe/Kyiv',
    updated_at: '2026-09-04T10:00:00.000Z',
  },
  {
    created_at: '2026-09-04T11:00:00.000Z',
    id: 'team-second',
    name: 'Second',
    owner_id: 'user-1',
    timezone: 'UTC',
    updated_at: '2026-09-04T11:00:00.000Z',
  },
];

describe('active team persistence', () => {
  it('keeps a stored team that is still accessible', () => {
    expect(resolveActiveTeamId('team-second', teams)).toBe('team-second');
  });

  it('falls back to the first available team after membership changes', () => {
    expect(resolveActiveTeamId('removed-team', teams)).toBe('team-first');
    expect(resolveActiveTeamId(null, [])).toBeNull();
  });

  it('uses a newly joined team as the explicit active-team preference', () => {
    expect(resolveActiveTeamId('team-first', teams, 'team-second')).toBe(
      'team-second',
    );
  });
});

describe('invite routes', () => {
  const token = 'a'.repeat(64);

  it('builds and accepts only a canonical local invite path', () => {
    const path = joinPath(token);
    expect(path).toBe(`/join/${token}`);
    expect(isInviteToken(token)).toBe(true);
    expect(safeJoinReturnPath(path)).toBe(path);
  });

  it('rejects malformed and external return paths', () => {
    expect(safeJoinReturnPath('https://example.com')).toBeNull();
    expect(safeJoinReturnPath('//example.com/today')).toBeNull();
    expect(safeJoinReturnPath('javascript:alert(1)')).toBeNull();
    expect(safeJoinReturnPath('today')).toBeNull();
    expect(safeJoinReturnPath('/join/not-a-token')).toBeNull();
    expect(safeJoinReturnPath('/checklists/a/b')).toBeNull();
    expect(safeJoinReturnPath('/unknown')).toBeNull();
    expect(safeJoinReturnPath(['/join/' + 'a'.repeat(64)])).toBeNull();
    expect(isInviteToken('A'.repeat(64))).toBe(false);
  });

  it('allows known product paths and retains their search query', () => {
    expect(safeJoinReturnPath('/today?date=2026-09-06')).toBe(
      '/today?date=2026-09-06',
    );
    expect(safeJoinReturnPath('/history?from=2026-09-01')).toBe(
      '/history?from=2026-09-01',
    );
    expect(safeJoinReturnPath('/checklists/checklist-1?tab=tasks')).toBe(
      '/checklists/checklist-1?tab=tasks',
    );
  });
});

describe('active tab persistence', () => {
  it('restores a stored tab when landing without an explicit tab', () => {
    expect(resolveActiveTeamTab('/team', '/')).toBe('/team');
    expect(resolveActiveTeamTab(null, '/')).toBe('/today');
  });

  it('honours an explicit tab root over a stored tab', () => {
    expect(resolveActiveTeamTab('/today', '/checklists')).toBe('/checklists');
    expect(resolveActiveTeamTab('/team', '/history')).toBe('/history');
    expect(resolveActiveTeamTab('/team', '/today')).toBe('/today');
  });

  it('keeps a valid current tab when no preference exists', () => {
    expect(resolveActiveTeamTab(null, '/history')).toBe('/history');
    expect(resolveActiveTeamTab(null, '/unknown')).toBe('/today');
    expect(isTeamTabPath('/checklists')).toBe(true);
    expect(isTeamTabPath('/unknown')).toBe(false);
  });

  it('treats checklist detail as the checklists tab without leaving the deep link', () => {
    expect(resolveTeamTabRoot('/checklists/abc')).toBe('/checklists');
    expect(isTeamTabPath('/checklists/abc')).toBe(false);
    expect(resolveActiveTeamTab('/checklists', '/checklists/abc')).toBe(
      '/checklists/abc',
    );
    expect(resolveActiveTeamTab('/team', '/checklists/abc')).toBe(
      '/checklists/abc',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { getTeamPermissions } from './team-permissions';
import type { Team } from './team-api';

const team = { id: 'team-1', owner_id: 'owner-1' } as Team;

describe('getTeamPermissions', () => {
  it('recognises an owner', () => {
    expect(getTeamPermissions(team, 'owner-1')).toEqual({
      canManage: true,
      isAdmin: false,
      isOwner: true,
    });
  });
  it('recognises an admin', () => {
    expect(getTeamPermissions({ ...team, myRole: 'admin' }, 'admin-1')).toEqual(
      { canManage: true, isAdmin: true, isOwner: false },
    );
  });
  it('keeps a member read-only', () => {
    expect(
      getTeamPermissions({ ...team, myRole: 'member' }, 'member-1'),
    ).toEqual({ canManage: false, isAdmin: false, isOwner: false });
  });
  it('falls back to owner-only for old mocks without myRole', () => {
    expect(getTeamPermissions(team, 'member-1').canManage).toBe(false);
  });
});

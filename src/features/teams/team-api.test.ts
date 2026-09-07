import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => {
  const single = vi.fn().mockResolvedValue({ data: {}, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ error: null, select });
  const from = vi.fn().mockReturnValue({ insert });
  return { from, insert, select, single };
});

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ from: supabase.from }),
}));

import { createTeam } from './team-api';

describe('createTeam', () => {
  beforeEach(() => {
    supabase.from.mockClear();
    supabase.insert.mockClear();
    supabase.select.mockClear();
    supabase.single.mockClear();
  });

  it('avoids RETURNING so the membership trigger completes before SELECT RLS', async () => {
    await createTeam({
      name: ' Нова команда ',
      ownerId: 'owner-1',
      timezone: ' Europe/Kyiv ',
    });

    expect(supabase.from).toHaveBeenCalledWith('teams');
    expect(supabase.insert).toHaveBeenCalledWith({
      name: 'Нова команда',
      owner_id: 'owner-1',
      timezone: 'Europe/Kyiv',
    });
    expect(supabase.select).not.toHaveBeenCalled();
    expect(supabase.single).not.toHaveBeenCalled();
  });
});

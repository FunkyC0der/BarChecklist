import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabase } from '@/lib/supabase';

import { fetchMemberStats, fetchMemberTaskStats } from './stats-api';

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
  unwrapRpcResult: (data: unknown) => (Array.isArray(data) ? data[0] : data),
}));

const rpc = vi.fn();
const mockedGetSupabase = vi.mocked(getSupabase);

const memberStatsResponse = {
  logicalToday: '2026-09-09',
  fromDate: '2026-08-11',
  toDate: '2026-09-09',
  teamCompletedCount: 3,
  members: [
    {
      userId: 'user-1',
      displayName: 'Олег',
      currentMember: true,
      completedCount: 3,
      taskCount: 1,
      lastCompletionDate: '2026-09-08',
    },
  ],
};
const memberTaskStatsResponse = {
  userId: 'user-1',
  displayName: 'Олег',
  currentMember: true,
  fromDate: '2026-08-11',
  toDate: '2026-09-09',
  logicalToday: '2026-09-09',
  completedCount: 3,
  tasks: [
    {
      taskId: 'task-1',
      taskTitle: 'Помити шейкери',
      checklistId: 'checklist-1',
      checklistName: 'Закриття',
      checklistArchived: false,
      taskArchived: false,
      completedCount: 3,
      lastCompletionDate: '2026-09-08',
    },
  ],
};

beforeEach(() => {
  rpc.mockReset();
  mockedGetSupabase.mockReturnValue({ rpc } as never);
});

describe('Stats API contracts', () => {
  it('omits unset filters so get_member_stats applies its default range', async () => {
    rpc.mockResolvedValue({ data: memberStatsResponse, error: null });

    await fetchMemberStats('team-1', {
      checklistId: null,
      fromDate: null,
      toDate: null,
    });

    expect(rpc).toHaveBeenCalledWith('get_member_stats', {
      p_team_id: 'team-1',
    });
  });

  it('maps every explicit filter to the exact get_member_stats argument', async () => {
    rpc.mockResolvedValue({ data: memberStatsResponse, error: null });

    await fetchMemberStats('team-1', {
      checklistId: 'checklist-1',
      fromDate: '2026-08-11',
      toDate: '2026-09-09',
    });

    expect(rpc).toHaveBeenCalledWith('get_member_stats', {
      p_checklist_id: 'checklist-1',
      p_from_date: '2026-08-11',
      p_team_id: 'team-1',
      p_to_date: '2026-09-09',
    });
  });

  it('parses a valid get_member_stats payload', async () => {
    rpc.mockResolvedValue({ data: memberStatsResponse, error: null });

    const result = await fetchMemberStats('team-1', {
      checklistId: null,
      fromDate: null,
      toDate: null,
    });

    expect(result.members[0]?.displayName).toBe('Олег');
  });

  it('throws and logs when the get_member_stats payload is invalid', async () => {
    rpc.mockResolvedValue({ data: { members: 'not-an-array' }, error: null });

    await expect(
      fetchMemberStats('team-1', {
        checklistId: null,
        fromDate: null,
        toDate: null,
      }),
    ).rejects.toBeTruthy();
  });

  it('throws when the get_member_stats RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(
      fetchMemberStats('team-1', {
        checklistId: null,
        fromDate: null,
        toDate: null,
      }),
    ).rejects.toThrow('boom');
  });

  it('passes the target user id to get_member_task_stats', async () => {
    rpc.mockResolvedValue({ data: memberTaskStatsResponse, error: null });

    await fetchMemberTaskStats('team-1', 'user-1', {
      checklistId: null,
      fromDate: null,
      toDate: null,
    });

    expect(rpc).toHaveBeenCalledWith('get_member_task_stats', {
      p_team_id: 'team-1',
      p_user_id: 'user-1',
    });
  });

  it('parses a valid get_member_task_stats payload', async () => {
    rpc.mockResolvedValue({ data: memberTaskStatsResponse, error: null });

    const result = await fetchMemberTaskStats('team-1', 'user-1', {
      checklistId: null,
      fromDate: null,
      toDate: null,
    });

    expect(result.tasks[0]?.taskTitle).toBe('Помити шейкери');
  });
});

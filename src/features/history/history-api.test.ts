import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabase } from '@/lib/supabase';

import {
  historyFilterOptionsSchema,
  fetchHistory,
  historySnapshotSchema,
} from './history-api';

vi.mock('@/lib/supabase', () => ({ getSupabase: vi.fn() }));

const rpc = vi.fn();
const mockedGetSupabase = vi.mocked(getSupabase);

const response = {
  logicalToday: '2026-09-06',
  fromDate: '2026-08-24',
  toDate: '2026-09-06',
  hasMore: false,
  nextBeforeDate: null,
  days: [],
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: response, error: null });
  mockedGetSupabase.mockReturnValue({ rpc } as never);
});

describe('History API contracts', () => {
  it('accepts the history day and cursor contract', () => {
    expect(
      historySnapshotSchema.parse({
        logicalToday: '2026-09-06',
        fromDate: '2026-08-24',
        toDate: '2026-09-06',
        hasMore: true,
        nextBeforeDate: '2026-08-24',
        days: [
          {
            date: '2026-09-06',
            completedCount: 1,
            completions: [
              {
                id: 'completion-1',
                taskId: 'task-1',
                taskTitle: 'Wipe bar',
                checklistId: 'checklist-1',
                checklistName: 'Close',
                completedBy: 'user-1',
                completedByName: 'Alex',
                completedAt: '2026-09-06T20:00:00Z',
              },
            ],
          },
        ],
      }),
    ).toHaveProperty('days[0].completions[0].completedByName', 'Alex');
  });

  it('requires filter options to retain archived and former-member context', () => {
    expect(
      historyFilterOptionsSchema.parse({
        checklists: [{ id: 'checklist-1', name: 'Close', archived: true }],
        users: [{ id: 'user-1', displayName: 'Alex', currentMember: false }],
      }),
    ).toHaveProperty('users[0].currentMember', false);
  });

  it('omits unset filters so the RPC applies its default range', async () => {
    await fetchHistory('team-1', {
      beforeDate: null,
      checklistId: null,
      fromDate: null,
      toDate: null,
      userId: null,
    });

    expect(rpc).toHaveBeenCalledWith('get_history', { p_team_id: 'team-1' });
  });

  it('maps every explicit filter to the exact RPC argument', async () => {
    await fetchHistory('team-1', {
      beforeDate: '2026-08-23',
      checklistId: 'checklist-1',
      fromDate: '2026-08-24',
      limit: 7,
      toDate: '2026-09-06',
      userId: 'user-1',
    });

    expect(rpc).toHaveBeenCalledWith('get_history', {
      p_before_date: '2026-08-23',
      p_checklist_id: 'checklist-1',
      p_from_date: '2026-08-24',
      p_limit: 7,
      p_team_id: 'team-1',
      p_to_date: '2026-09-06',
      p_user_id: 'user-1',
    });
  });
});

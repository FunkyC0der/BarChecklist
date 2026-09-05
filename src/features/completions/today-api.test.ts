import { describe, expect, it } from 'vitest';

import { parseCompletionMutation, todaySnapshotSchema } from './today-api';

describe('Today API contracts', () => {
  it('accepts the canonical snapshot shape', () => {
    expect(
      todaySnapshotSchema.parse({
        logicalDate: '2026-09-05',
        timezone: 'Europe/Kyiv',
        checklists: [
          {
            id: 'c1',
            name: 'Open',
            createdAt: '2026-09-05T00:00:00Z',
            tasks: [
              {
                id: 't1',
                title: 'Wipe bar',
                position: 0,
                completion: {
                  id: 'x1',
                  completedBy: 'u1',
                  completedByName: 'Alex',
                  completedAt: '2026-09-05T08:00:00Z',
                },
              },
            ],
          },
        ],
      }),
    ).toHaveProperty(
      'checklists[0].tasks[0].completion.completedByName',
      'Alex',
    );
  });

  it('accepts array-wrapped RPC responses and rejects unknown statuses', () => {
    expect(
      parseCompletionMutation([{ status: 'created' }], ['created']),
    ).toEqual({ status: 'created' });
    expect(() =>
      parseCompletionMutation({ status: 'unexpected' }, ['created']),
    ).toThrow();
  });
});

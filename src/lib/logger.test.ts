import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  getSupabase: () => ({ rpc: vi.fn().mockResolvedValue({ error: null }) }),
}));

describe('logger', () => {
  it('drops disallowed context keys but keeps allowlisted ids', async () => {
    const { logger } = await import('./logger');
    const { getRecentEvents } = await import('./log-sink');

    logger.error('privacy.probe', new Error('boom'), {
      email: 'user@example.com',
      teamId: 'team-1',
      title: 'My checklist',
      token: 'secret-token',
      userId: 'user-1',
    });

    const entry = getRecentEvents()
      .filter((event) => event.event === 'privacy.probe')
      .at(-1);
    expect(entry).toBeDefined();
    expect(entry?.context).toMatchObject({
      teamId: 'team-1',
      userId: 'user-1',
    });
    expect(entry?.context.email).toBeUndefined();
    expect(entry?.context.token).toBeUndefined();
    expect(entry?.context.title).toBeUndefined();
  });

  it('only queues warn and error levels for the sink', async () => {
    vi.resetModules();
    const { logger } = await import('./logger');
    const { getRecentEvents } = await import('./log-sink');

    logger.debug('levels.debug-probe');
    logger.info('levels.info-probe');
    expect(
      getRecentEvents().some((event) => event.event === 'levels.debug-probe'),
    ).toBe(false);
    expect(
      getRecentEvents().some((event) => event.event === 'levels.info-probe'),
    ).toBe(false);

    logger.warn('levels.warn-probe');
    expect(
      getRecentEvents().some((event) => event.event === 'levels.warn-probe'),
    ).toBe(true);
  });

  it('keeps only the most recent 50 entries in the ring buffer', async () => {
    vi.resetModules();
    const { logger } = await import('./logger');
    const { getRecentEvents } = await import('./log-sink');

    for (let index = 0; index < 60; index += 1) {
      logger.warn(`buffer.probe-${index}`);
    }

    const events = getRecentEvents();
    expect(events.length).toBeLessThanOrEqual(50);
    expect(events.some((event) => event.event === 'buffer.probe-59')).toBe(
      true,
    );
    expect(events.some((event) => event.event === 'buffer.probe-0')).toBe(
      false,
    );
  });
});

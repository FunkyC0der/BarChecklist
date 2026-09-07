import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => {
  const channels: Array<{
    callbacks: Array<(status: string) => void>;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }> = [];
  const removeChannel = vi.fn();
  const channel = vi.fn(() => {
    const item = {
      callbacks: [] as Array<(status: string) => void>,
      on: vi.fn(function (this: typeof item) {
        return this;
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        item.callbacks.push(callback);
        return item;
      }),
    };
    channels.push(item);
    return item;
  });
  return { channels, channel, removeChannel };
});

vi.mock('@/lib/env', () => ({ getPublicEnvIssue: () => null }));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => supabase }));

import { useTodayRealtime } from './use-today-realtime';

describe('useTodayRealtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    supabase.channels.length = 0;
    supabase.channel.mockClear();
    supabase.removeChannel.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('connects, debounces refresh, and subscribes tasks with one IN filter', () => {
    const refresh = vi.fn();
    const { result } = renderHook(() =>
      useTodayRealtime({
        teamId: 'team',
        checklistIds: ['c1', 'c2'],
        onRefresh: refresh,
      }),
    );
    expect(result.current.realtimeStatus).toBe('connecting');
    const current = supabase.channels[0]!;
    expect(current.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'tasks',
        filter: 'checklist_id=in.(c1,c2)',
      }),
      expect.any(Function),
    );
    expect(current.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'teams', filter: 'id=eq.team' }),
      expect.any(Function),
    );
    act(() => current.callbacks[0]!('SUBSCRIBED'));
    expect(result.current.realtimeStatus).toBe('connected');
    act(() => vi.advanceTimersByTime(149));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not report a warning while the team subscription is initializing', () => {
    const { result } = renderHook(() =>
      useTodayRealtime({
        teamId: null,
        checklistIds: [],
        onRefresh: vi.fn(),
      }),
    );

    expect(result.current.realtimeStatus).toBe('connecting');
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'] as const)(
    'reports %s as degraded',
    (status) => {
      const { result } = renderHook(() =>
        useTodayRealtime({
          teamId: 'team',
          checklistIds: [],
          onRefresh: vi.fn(),
        }),
      );
      act(() => supabase.channels[0]!.callbacks[0]!(status));
      expect(result.current.realtimeStatus).toBe('degraded');
    },
  );

  it('retries with a fresh channel and removes the old channel', () => {
    const { result } = renderHook(() =>
      useTodayRealtime({
        teamId: 'team',
        checklistIds: [],
        onRefresh: vi.fn(),
      }),
    );
    const oldChannel = supabase.channels[0]!;
    act(() => result.current.retryRealtime());
    expect(supabase.channels).toHaveLength(2);
    expect(supabase.removeChannel).toHaveBeenCalledWith(oldChannel);
  });

  it('clears pending refresh and removes channel on team change and unmount', () => {
    const refresh = vi.fn();
    const hook = renderHook(
      ({ teamId }) =>
        useTodayRealtime({ teamId, checklistIds: ['c1'], onRefresh: refresh }),
      { initialProps: { teamId: 'team' } },
    );
    const first = supabase.channels[0]!;
    act(() => first.callbacks[0]!('SUBSCRIBED'));
    hook.rerender({ teamId: 'other' });
    expect(hook.result.current.realtimeStatus).toBe('connecting');
    expect(supabase.removeChannel).toHaveBeenCalledWith(first);
    act(() => vi.runAllTimers());
    expect(refresh).not.toHaveBeenCalled();
    const second = supabase.channels[1]!;
    hook.unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(second);
  });
});

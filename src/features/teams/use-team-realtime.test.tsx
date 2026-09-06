import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestChannel = {
  name: string;
  on: ReturnType<typeof vi.fn>;
  statusCallback: ((status: string) => void) | null;
  subscribe: ReturnType<typeof vi.fn>;
};

const realtime = vi.hoisted(() => ({
  channels: [] as TestChannel[],
  client: {
    channel: vi.fn(),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  },
  getSupabase: vi.fn(),
}));

realtime.getSupabase.mockReturnValue(realtime.client);

vi.mock('@/lib/env', () => ({ getPublicEnvIssue: () => null }));
vi.mock('@/lib/supabase', () => ({ getSupabase: realtime.getSupabase }));

import { useTeamRealtime } from './use-team-realtime';

function setupChannel(name: string): TestChannel {
  const channel: TestChannel = {
    name,
    on: vi.fn(),
    statusCallback: null,
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockImplementation((callback) => {
    channel.statusCallback = callback;
    return channel;
  });
  realtime.channels.push(channel);
  return channel;
}

function emit(channel: TestChannel, status: string) {
  act(() => channel.statusCallback?.(status));
}

describe('useTeamRealtime', () => {
  beforeEach(() => {
    realtime.channels.length = 0;
    realtime.client.channel.mockReset();
    realtime.client.removeChannel.mockReset();
    realtime.client.removeChannel.mockResolvedValue('ok');
    realtime.client.channel.mockImplementation(setupChannel);
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])(
    'reports %s as a degraded connection',
    async (realtimeStatus) => {
      const { result } = renderHook(() =>
        useTeamRealtime({
          isOwner: false,
          onInviteChange: vi.fn(),
          onMembersChange: vi.fn(),
          onTeamChange: vi.fn(),
          teamId: 'team-1',
        }),
      );

      await waitFor(() => expect(realtime.channels).toHaveLength(1));
      emit(realtime.channels[0]!, realtimeStatus);
      expect(result.current.status).toBe('degraded');
    },
  );

  it('replaces a failed channel exactly once on explicit retry', async () => {
    const { result } = renderHook(() =>
      useTeamRealtime({
        isOwner: false,
        onInviteChange: vi.fn(),
        onMembersChange: vi.fn(),
        onTeamChange: vi.fn(),
        teamId: 'team-1',
      }),
    );

    await waitFor(() => expect(realtime.channels).toHaveLength(1));
    emit(realtime.channels[0]!, 'CHANNEL_ERROR');
    act(() => result.current.retry());

    await waitFor(() => expect(realtime.channels).toHaveLength(2));
    expect(realtime.client.removeChannel).toHaveBeenCalledTimes(1);
    expect(realtime.channels[0]!.subscribe).toHaveBeenCalledOnce();
    expect(realtime.channels[1]!.subscribe).toHaveBeenCalledOnce();
    emit(realtime.channels[1]!, 'SUBSCRIBED');
    expect(result.current.status).toBe('connected');
  });

  it('cleans up the previous channel when the active team changes', async () => {
    const options = {
      isOwner: false,
      onInviteChange: vi.fn(),
      onMembersChange: vi.fn(),
      onTeamChange: vi.fn(),
      teamId: 'team-1',
    };
    const { rerender } = renderHook((props) => useTeamRealtime(props), {
      initialProps: options,
    });

    await waitFor(() => expect(realtime.channels).toHaveLength(1));
    rerender({ ...options, teamId: 'team-2' });
    await waitFor(() => expect(realtime.channels).toHaveLength(2));
    expect(realtime.channels.map((channel) => channel.name)).toEqual([
      'team:team-1',
      'team:team-2',
    ]);
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channels[0],
    );
  });

  it('refreshes invites only for owners and replaces one channel after repeated online events', async () => {
    const onInviteChange = vi.fn();
    const onMembersChange = vi.fn();
    const onTeamChange = vi.fn();
    const { result } = renderHook(() =>
      useTeamRealtime({
        isOwner: true,
        onInviteChange,
        onMembersChange,
        onTeamChange,
        teamId: 'team-1',
      }),
    );

    await waitFor(() => expect(realtime.channels).toHaveLength(1));
    expect(realtime.channels[0]!.on).toHaveBeenCalledTimes(3);
    act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });

    expect(onTeamChange).toHaveBeenCalledTimes(2);
    expect(onMembersChange).toHaveBeenCalledTimes(2);
    expect(onInviteChange).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(realtime.channels).toHaveLength(2));
    expect(realtime.client.removeChannel).toHaveBeenCalledTimes(1);
    expect(realtime.channels[1]!.on).toHaveBeenCalledTimes(3);
    emit(realtime.channels[1]!, 'SUBSCRIBED');
    expect(result.current.status).toBe('connected');
  });

  it('does not subscribe to invite changes or refresh them for members', async () => {
    const onInviteChange = vi.fn();
    const { result } = renderHook(() =>
      useTeamRealtime({
        isOwner: false,
        onInviteChange,
        onMembersChange: vi.fn(),
        onTeamChange: vi.fn(),
        teamId: 'team-1',
      }),
    );

    await waitFor(() => expect(realtime.channels).toHaveLength(1));
    expect(realtime.channels[0]!.on).toHaveBeenCalledTimes(2);
    act(() => window.dispatchEvent(new Event('online')));
    expect(onInviteChange).not.toHaveBeenCalled();
    await waitFor(() => expect(realtime.channels).toHaveLength(2));
    expect(result.current.status).toBe('connecting');
  });
});

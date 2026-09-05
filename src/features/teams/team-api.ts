import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database.generated';

export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'] & {
  displayName: string;
};
export type InviteInspection = {
  alreadyMember: boolean;
  status: 'active' | 'expired' | 'invalid' | 'revoked';
  teamId: string | null;
  teamName: string | null;
};

export async function fetchTeams() {
  const { data, error } = await getSupabase()
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTeam(values: {
  name: string;
  ownerId: string;
  timezone: string;
}) {
  const { error } = await getSupabase().from('teams').insert({
    name: values.name.trim(),
    owner_id: values.ownerId,
    timezone: values.timezone.trim(),
  });
  if (error) throw error;
}

export async function updateTeam(
  teamId: string,
  values: { name: string; timezone: string },
) {
  const { error } = await getSupabase()
    .from('teams')
    .update({ name: values.name.trim(), timezone: values.timezone.trim() })
    .eq('id', teamId);
  if (error) throw error;
}

export async function deleteTeam(teamId: string) {
  const { error } = await getSupabase().from('teams').delete().eq('id', teamId);
  if (error) throw error;
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data: memberships, error: membershipsError } = await getSupabase()
    .from('team_members')
    .select('user_id, team_id, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });
  if (membershipsError) throw membershipsError;

  const userIds = memberships.map((membership) => membership.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await getSupabase()
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const namesById = new Map(
    profiles.map((profile) => [profile.id, profile.display_name]),
  );
  return memberships.map((membership) => ({
    ...membership,
    displayName: namesById.get(membership.user_id) ?? 'Учасник',
  }));
}

export async function createTeamInvite(teamId: string) {
  const { data, error } = await getSupabase().rpc('create_team_invite', {
    p_team_id: teamId,
  });
  if (error) throw error;
  const invite = data[0];
  if (!invite) throw new Error('Не вдалося створити посилання-запрошення.');
  return invite;
}

export async function revokeTeamInvite(teamId: string) {
  const { error } = await getSupabase().rpc('revoke_team_invite', {
    p_team_id: teamId,
  });
  if (error) throw error;
}

export async function fetchCurrentTeamInvite(teamId: string) {
  const { data, error } = await getSupabase()
    .from('team_invites')
    .select('expires_at')
    .eq('team_id', teamId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function inspectTeamInvite(
  token: string,
): Promise<InviteInspection> {
  const { data, error } = await getSupabase().rpc('inspect_team_invite', {
    p_token: token,
  });
  if (error) throw error;
  const invite = data[0];
  if (!invite)
    return {
      alreadyMember: false,
      status: 'invalid',
      teamId: null,
      teamName: null,
    };

  const status = ['active', 'expired', 'invalid', 'revoked'].includes(
    invite.status,
  )
    ? (invite.status as InviteInspection['status'])
    : 'invalid';
  return {
    alreadyMember: invite.already_member,
    status,
    teamId: invite.team_id,
    teamName: invite.team_name,
  };
}

export async function acceptTeamInvite(token: string) {
  const { data, error } = await getSupabase().rpc('accept_team_invite', {
    p_token: token,
  });
  if (error) throw error;
  const result = data[0];
  if (!result) throw new Error('Не вдалося приєднатися до команди.');
  return result;
}

export async function leaveTeam(teamId: string) {
  const { error } = await getSupabase().rpc('leave_team', {
    p_team_id: teamId,
  });
  if (error) throw error;
}

export async function removeTeamMember(teamId: string, userId: string) {
  const { error } = await getSupabase().rpc('remove_team_member', {
    p_team_id: teamId,
    p_user_id: userId,
  });
  if (error) throw error;
}

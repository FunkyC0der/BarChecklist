import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database.generated';

export type Checklist = Database['public']['Tables']['checklists']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type ChecklistCadence = Database['public']['Enums']['checklist_cadence'];

export async function fetchChecklists(teamId: string) {
  const { data, error } = await getSupabase()
    .from('checklists')
    .select('*')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchChecklist(checklistId: string) {
  const { data, error } = await getSupabase()
    .from('checklists')
    .select('*')
    .eq('id', checklistId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchActiveTaskCounts(checklistIds: string[]) {
  const counts = new Map<string, number>();
  if (checklistIds.length === 0) return counts;

  const { data, error } = await getSupabase()
    .from('tasks')
    .select('checklist_id')
    .in('checklist_id', checklistIds)
    .is('deleted_at', null);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.checklist_id, (counts.get(row.checklist_id) ?? 0) + 1);
  }
  return counts;
}

export async function createChecklist(values: {
  cadence: ChecklistCadence;
  createdBy: string;
  name: string;
  teamId: string;
  weekdays: number[];
}) {
  const { error } = await getSupabase()
    .from('checklists')
    .insert({
      cadence: values.cadence,
      created_by: values.createdBy,
      name: values.name.trim(),
      team_id: values.teamId,
      weekdays: values.cadence === 'daily' ? [] : values.weekdays,
    });
  if (error) throw error;
}

export async function updateChecklist(
  checklistId: string,
  values: {
    cadence: ChecklistCadence;
    name: string;
    weekdays: number[];
  },
) {
  const { error } = await getSupabase()
    .from('checklists')
    .update({
      cadence: values.cadence,
      name: values.name.trim(),
      weekdays: values.cadence === 'daily' ? [] : values.weekdays,
    })
    .eq('id', checklistId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function deleteChecklist(checklistId: string) {
  const { error } = await getSupabase().rpc('soft_delete_checklist', {
    p_checklist_id: checklistId,
  });
  if (error) throw error;
}

export async function fetchTasks(checklistId: string) {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('checklist_id', checklistId)
    .is('deleted_at', null)
    .order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTask(checklistId: string, title: string) {
  const { data, error } = await getSupabase().rpc('create_checklist_task', {
    p_checklist_id: checklistId,
    p_title: title,
  });
  if (error) throw error;

  const task = Array.isArray(data) ? data[0] : data;
  if (!task) throw new Error('Не вдалося створити задачу.');
  return task;
}

export async function updateTask(taskId: string, title: string) {
  const { error } = await getSupabase()
    .from('tasks')
    .update({ title: title.trim() })
    .eq('id', taskId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function reorderTasks(checklistId: string, taskIds: string[]) {
  const { error } = await getSupabase().rpc('reorder_checklist_tasks', {
    p_checklist_id: checklistId,
    p_task_ids: taskIds,
  });
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await getSupabase().rpc('soft_delete_task', {
    p_task_id: taskId,
  });
  if (error) throw error;
}

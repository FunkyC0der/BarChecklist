import { queryOptions } from '@tanstack/react-query';
import {
  fetchActiveTaskCounts,
  fetchChecklists,
} from '@/features/checklists/checklist-api';
import { queryKeys } from '@/lib/query-client';

export function checklistListQueryOptions(teamId: string) {
  return queryOptions({
    queryFn: async () => {
      const nextChecklists = await fetchChecklists(teamId);
      return {
        checklists: nextChecklists,
        taskCounts: await fetchActiveTaskCounts(
          nextChecklists.map(({ id }) => id),
        ),
      };
    },
    queryKey: queryKeys.checklistList(teamId),
  });
}

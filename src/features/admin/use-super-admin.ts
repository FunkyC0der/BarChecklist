import { useQuery } from '@tanstack/react-query';

import { superAdminFlagQueryOptions } from '@/features/admin/admin-queries';
import { useAuth } from '@/features/auth/auth-context';

export function useSuperAdmin() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    ...superAdminFlagQueryOptions(userId ?? 'none'),
    enabled: Boolean(userId),
  });

  return {
    isAdmin: query.data ?? false,
    isResolved: query.isSuccess || query.isError,
  };
}

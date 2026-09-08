import { QueryClient } from '@tanstack/react-query';

/** Creates an isolated client with deterministic retry behavior for a test. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchEntityHistory } from '../api/client';

interface HistoryOptions {
  hours?: number;
  intervalMinutes?: number;
}

interface HookOptions {
  enabled?: boolean;
}

export const useEntityHistory = (
  entityId: string | undefined,
  params?: HistoryOptions,
  options?: HookOptions,
) =>
  useQuery({
    queryKey: ['entity-history', entityId, params?.hours ?? null, params?.intervalMinutes ?? null],
    queryFn: () => {
      if (!entityId) {
        throw new Error('Missing entity id for history');
      }
      return fetchEntityHistory(entityId, params);
    },
    enabled: Boolean(entityId) && (options?.enabled ?? true),
    staleTime: 60_000,
  });

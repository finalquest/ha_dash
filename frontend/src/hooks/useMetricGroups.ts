import { useQuery } from '@tanstack/react-query';
import { fetchMetricGroupState, fetchMetricGroups } from '../api/client';

export const useMetricGroups = () =>
  useQuery({
    queryKey: ['metric-groups'],
    queryFn: fetchMetricGroups,
    staleTime: 60_000,
  });

export const useMetricGroupState = (groupId: string | undefined) =>
  useQuery({
    queryKey: ['metric-groups', groupId, 'state'],
    queryFn: () => {
      if (!groupId) {
        throw new Error('Missing metric group id');
      }
      return fetchMetricGroupState(groupId);
    },
    enabled: Boolean(groupId),
    refetchInterval: 30_000,
  });

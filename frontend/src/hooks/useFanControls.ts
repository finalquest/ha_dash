import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HaEntity } from '../api/types';
import { setFanPercentage, toggleFan } from '../api/client';

export const useFanToggle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => toggleFan(entityId),
    onMutate: async (entityId: string) => {
      await queryClient.cancelQueries({ queryKey: ['entities'] });
      const previous = queryClient.getQueryData<HaEntity[]>(['entities']);
      queryClient.setQueryData<HaEntity[]>(['entities'], (current) => {
        if (!current) return current;
        return current.map((entity) => {
          if (entity.entity_id !== entityId) {
            return entity;
          }
          const nextState = entity.state === 'on' ? 'off' : 'on';
          const timestamp = new Date().toISOString();
          return {
            ...entity,
            state: nextState,
            last_changed: timestamp,
            last_updated: timestamp,
          };
        });
      });
      return { previous };
    },
    onError: (_error, _entityId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['entities'], context.previous);
      } else {
        queryClient.invalidateQueries({ queryKey: ['entities'] });
      }
    },
  });
};

export const useFanPercentage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, percentage }: { entityId: string; percentage: number }) =>
      setFanPercentage(entityId, percentage),
    onMutate: async ({ entityId, percentage }) => {
      await queryClient.cancelQueries({ queryKey: ['entities'] });
      const previous = queryClient.getQueryData<HaEntity[]>(['entities']);
      queryClient.setQueryData<HaEntity[]>(['entities'], (current) => {
        if (!current) return current;
        return current.map((entity) => {
          if (entity.entity_id !== entityId) {
            return entity;
          }
          return {
            ...entity,
            attributes: {
              ...entity.attributes,
              percentage,
            },
          };
        });
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['entities'], context.previous);
      } else {
        queryClient.invalidateQueries({ queryKey: ['entities'] });
      }
    },
  });
};

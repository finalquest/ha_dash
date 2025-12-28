import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HaEntity } from '../api/types';
import { activateScene } from '../api/client';

export const useSceneActivate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => activateScene(entityId),
    onMutate: async (entityId: string) => {
      await queryClient.cancelQueries({ queryKey: ['entities'] });
      const previous = queryClient.getQueryData<HaEntity[]>(['entities']);
      const timestamp = new Date().toISOString();
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
              __ha_dash_last_triggered: timestamp,
            },
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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HaEntity } from '../api/types';
import { setClimateHvacMode, setClimateTemperature } from '../api/client';

export const useClimateModeControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, mode }: { entityId: string; mode: string }) => setClimateHvacMode(entityId, mode),
    onMutate: async ({ entityId, mode }) => {
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
            state: mode,
            last_changed: timestamp,
            last_updated: timestamp,
            attributes: {
              ...entity.attributes,
              hvac_mode: mode,
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

export const useClimateTemperatureControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, temperature }: { entityId: string; temperature: number }) =>
      setClimateTemperature(entityId, temperature),
    onMutate: async ({ entityId, temperature }) => {
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
            last_updated: timestamp,
            attributes: {
              ...entity.attributes,
              temperature,
              target_temperature: temperature,
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

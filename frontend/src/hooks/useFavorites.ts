import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFavorite, deleteFavorite, fetchFavorites } from '../api/client';
import type { HaEntity, FavoriteEntry } from '../api/types';

export const useFavorites = () =>
  useQuery({
    queryKey: ['favorites'],
    queryFn: () => fetchFavorites(),
    staleTime: 60_000,
  });

export const useFavoriteToggle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entity,
      favorite,
      cardType,
      config,
      title,
    }: {
      entity?: HaEntity;
      favorite?: FavoriteEntry;
      cardType?: string;
      config?: Record<string, unknown>;
      title?: string;
    }) => {
      if (favorite) {
        await deleteFavorite(favorite.id);
        return;
      }

      let resolvedCardType = cardType;
      let resolvedConfig = config;
      let resolvedTitle = title;

      if (!resolvedCardType && entity) {
        resolvedCardType = 'entity';
      }
      if (!resolvedConfig && entity) {
        resolvedConfig = {
          entity_id: entity.entity_id,
          area_id: entity.attributes.area_id,
        };
      }
      if (!resolvedTitle && entity) {
        resolvedTitle =
          (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
      }

      if (!resolvedCardType || !resolvedConfig) {
        throw new Error('Missing data to create favorite');
      }

      await createFavorite({
        cardType: resolvedCardType,
        config: resolvedConfig,
        title: resolvedTitle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

export const useDeleteFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (favoriteId: string) => deleteFavorite(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFavorite, deleteFavorite, fetchFavorites } from '../api/client';
import type { HaEntity, FavoriteEntry } from '../api/types';

const FAVORITE_CARD_TYPE = 'entity';

export const useFavorites = () =>
  useQuery({
    queryKey: ['favorites'],
    queryFn: () => fetchFavorites(),
    staleTime: 60_000,
  });

export const useFavoriteToggle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entity, favorite }: { entity: HaEntity; favorite?: FavoriteEntry }) => {
      if (favorite) {
        await deleteFavorite(favorite.id);
        return;
      }

      const friendlyName =
        (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;

      await createFavorite({
        cardType: FAVORITE_CARD_TYPE,
        config: {
          entity_id: entity.entity_id,
          area_id: entity.attributes.area_id,
        },
        title: friendlyName,
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

import { useMemo } from 'react';
import type { HaEntity, FavoriteEntry } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { SwitchCard } from '../components/SwitchCard';
import { useLightControl } from '../hooks/useLightControl';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';

const isSwitchEntity = (entity: HaEntity) => entity.entity_id.startsWith('switch.');

export const SwitchesDashboardView = () => {
  const {
    data: entities = [],
    isLoading,
    isError,
    error,
  } = useEntities();
  const switchControl = useLightControl();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useFavoriteToggle();

  const switchEntities = useMemo(() => entities.filter(isSwitchEntity), [entities]);

  const grouped = useMemo(() => {
    return switchEntities.reduce<Record<string, { label: string; items: HaEntity[] }>>((acc, entity) => {
      const areaId = (entity.attributes.area_id as string | undefined) ?? 'unassigned';
      if (!acc[areaId]) {
        const areaName =
          (entity.attributes.area_name as string | undefined) ||
          (areaId === 'unassigned' ? 'Sin zona' : areaId);
        acc[areaId] = { label: areaName, items: [] };
      }
      acc[areaId].items.push(entity);
      return acc;
    }, {});
  }, [switchEntities]);

  const favoriteMap = useMemo(() => {
    return favorites.reduce<Map<string, FavoriteEntry>>((acc, favorite) => {
      if (favorite.cardType !== 'entity') return acc;
      const entityId = favorite.config?.entity_id;
      if (typeof entityId === 'string') {
        acc.set(entityId, favorite);
      }
      return acc;
    }, new Map());
  }, [favorites]);

  if (isLoading) {
    return (
      <section className="panel">
        <p>Cargando switches...</p>
      </section>
    );
  }

  if (isError) {
    const message = (error as Error | undefined)?.message ?? 'No pudimos cargar los switches.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  const handleToggle = (entity: HaEntity) => {
    switchControl.mutate(entity.entity_id);
  };

  return (
    <section>

      {Object.entries(grouped).map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.label}</h3>
          <div className="entity-grid">
            {group.items.map((entity) => (
              <SwitchCard
                key={entity.entity_id}
                entity={entity}
                onToggle={handleToggle}
                disabled={switchControl.isPending}
                isFavorite={favoriteMap.has(entity.entity_id)}
                onToggleFavorite={(candidate) =>
                  toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
                }
                favoriteDisabled={toggleFavorite.isPending}
              />
            ))}
          </div>
        </section>
      ))}

      {switchEntities.length === 0 && (
        <section className="panel">
          <p>No encontramos switches en Home Assistant.</p>
        </section>
      )}
    </section>
  );
};

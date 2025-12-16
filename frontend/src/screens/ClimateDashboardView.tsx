import { useMemo } from 'react';
import type { HaEntity, FavoriteEntry } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { FanCard } from '../components/FanCard';
import { EntityCard } from '../components/EntityCard';
import { useFanPercentage, useFanToggle } from '../hooks/useFanControls';

const groupByArea = (entities: HaEntity[]) => {
  return entities.reduce<Record<string, { label: string; items: HaEntity[] }>>((acc, entity) => {
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
};

const buildFavoriteMap = (favorites: FavoriteEntry[]) => {
  return favorites.reduce<Map<string, FavoriteEntry>>((acc, favorite) => {
    if (favorite.cardType !== 'entity') return acc;
    const entityId = favorite.config?.entity_id;
    if (typeof entityId === 'string') {
      acc.set(entityId, favorite);
    }
    return acc;
  }, new Map());
};

const isFan = (entity: HaEntity) => entity.entity_id.startsWith('fan.');
const isClimate = (entity: HaEntity) => entity.entity_id.startsWith('climate.');

export const ClimateDashboardView = () => {
  const {
    data: entities = [],
    isLoading,
    isError,
    error,
  } = useEntities();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useFavoriteToggle();
  const fanToggle = useFanToggle();
  const fanPercentage = useFanPercentage();

  const fanEntities = useMemo(() => entities.filter(isFan), [entities]);
  const climateEntities = useMemo(() => entities.filter(isClimate), [entities]);

  const fanGroups = useMemo(() => groupByArea(fanEntities), [fanEntities]);
  const climateGroups = useMemo(() => groupByArea(climateEntities), [climateEntities]);

  const favoriteMap = useMemo(() => buildFavoriteMap(favorites), [favorites]);

  if (isLoading) {
    return (
      <section className="panel">
        <p>Cargando clima...</p>
      </section>
    );
  }

  if (isError) {
    const message = (error as Error | undefined)?.message ?? 'No pudimos cargar los datos de clima.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  const handleFanToggle = (entity: HaEntity) => fanToggle.mutate(entity.entity_id);
  const handleFanPercentage = (entity: HaEntity, percentage: number) =>
    fanPercentage.mutate({ entityId: entity.entity_id, percentage });

  return (
    <section>
      <section className="panel entity-group">
        <h3>Fans</h3>
        {fanEntities.length === 0 ? (
          <p>No encontramos ventiladores en Home Assistant.</p>
        ) : (
          Object.entries(fanGroups).map(([areaId, group]) => (
            <div key={areaId} className="entity-group">
              <h4>{group.label}</h4>
              <div className="entity-grid">
                {group.items.map((entity) => (
                  <FanCard
                    key={entity.entity_id}
                    entity={entity}
                    onToggle={handleFanToggle}
                    onChangePercentage={handleFanPercentage}
                    disabled={fanToggle.isPending}
                    percentageDisabled={fanPercentage.isPending}
                    isFavorite={favoriteMap.has(entity.entity_id)}
                    onToggleFavorite={(candidate) =>
                      toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
                    }
                    favoriteDisabled={toggleFavorite.isPending}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="panel entity-group">
        <h3>AC</h3>
        {climateEntities.length === 0 ? (
          <p>No encontramos aires acondicionados registrados.</p>
        ) : (
          Object.entries(climateGroups).map(([areaId, group]) => (
            <div key={areaId} className="entity-group">
              <h4>{group.label}</h4>
              <div className="entity-grid">
                {group.items.map((entity) => (
                  <EntityCard
                    key={entity.entity_id}
                    entity={entity}
                    isFavorite={favoriteMap.has(entity.entity_id)}
                    onToggleFavorite={(candidate) =>
                      toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
                    }
                    favoriteDisabled={toggleFavorite.isPending}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </section>
  );
};

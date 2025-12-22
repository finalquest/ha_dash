import { useMemo, useState } from 'react';
import { useEntities } from '../hooks/useEntities';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import type { FavoriteEntry } from '../api/types';
import { SensorCard } from '../components/SensorCard';
import { buildSensorGroups, isSensorEntity } from '../lib/sensorUtils';

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

export const SensorsDashboardView = () => {
  const { data: entities = [], isLoading, isError, error } = useEntities();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useFavoriteToggle();
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const sensors = useMemo(() => {
    const next = entities.filter(isSensorEntity);
    if (!normalizedSearch) {
      return next;
    }
    return next.filter((entity) => {
      const name = (entity.attributes.friendly_name as string | undefined)?.toLowerCase() ?? '';
      return entity.entity_id.toLowerCase().includes(normalizedSearch) || name.includes(normalizedSearch);
    });
  }, [entities, normalizedSearch]);
  const groups = useMemo(() => buildSensorGroups(sensors), [sensors]);
  const sortedGroupEntries = useMemo(() => {
    return Object.entries(groups).sort((a, b) => a[1].label.localeCompare(b[1].label, 'es', { sensitivity: 'base' }));
  }, [groups]);

  if (isLoading) {
    return (
      <section className="panel">
        <p>Cargando sensores...</p>
      </section>
    );
  }

  if (isError) {
    const message = (error as Error | undefined)?.message ?? 'No pudimos cargar los sensores.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  const favoriteMap = useMemo(() => buildFavoriteMap(favorites), [favorites]);

  return (
    <section>
      <div className="panel filters">
        <input
          type="text"
          placeholder="Buscar por nombre o entity_id"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {sensors.length === 0 && (
        <section className="panel">
          <p>No encontramos sensores con los filtros aplicados.</p>
        </section>
      )}

      {sortedGroupEntries.map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.label}</h3>
          <div className="sensor-grid">
            {group.items.map((entity) => {
              return (
                <SensorCard
                  key={entity.entity_id}
                  entity={entity}
                  isFavorite={favoriteMap.has(entity.entity_id)}
                  onToggleFavorite={(candidate) =>
                    toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
                  }
                  favoriteDisabled={toggleFavorite.isPending}
                />
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
};

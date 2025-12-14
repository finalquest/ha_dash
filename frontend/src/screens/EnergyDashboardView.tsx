import { useMemo } from 'react';
import type { FavoriteEntry, HaEntity, MetricGroup, MetricType } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { useMetricGroups } from '../hooks/useMetricGroups';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { EntityCard } from '../components/EntityCard';
import { EnergyMetricGroupCard } from '../components/EnergyMetricGroupCard';

const ENERGY_DEVICE_CLASSES = new Set(['energy', 'power', 'current', 'voltage']);
const REQUIRED_METRICS: MetricType[] = ['power', 'voltage', 'current'];

const isEnergyEntity = (entity: HaEntity) => {
  const deviceClass = (entity.attributes.device_class as string | undefined)?.toLowerCase();
  if (deviceClass && ENERGY_DEVICE_CLASSES.has(deviceClass)) {
    return true;
  }

  const entityId = entity.entity_id.toLowerCase();
  if (entityId.includes('energy')) {
    return true;
  }

  const friendlyName = (entity.attributes.friendly_name as string | undefined)?.toLowerCase();
  return friendlyName ? friendlyName.includes('energy') : false;
};

const groupEnergyMetricGroups = (metricGroups: MetricGroup[]) =>
  metricGroups.filter((group) =>
    REQUIRED_METRICS.every((metricType) => Boolean(group.metrics[metricType])),
  );

export const EnergyDashboardView = () => {
  const {
    data: entities = [],
    isLoading,
    isError,
    error,
  } = useEntities();

  const {
    data: metricGroups = [],
    isLoading: isLoadingMetricGroups,
    isError: metricGroupsError,
    error: metricGroupsErrorMessage,
  } = useMetricGroups();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useFavoriteToggle();

  const energyEntities = useMemo(() => entities.filter(isEnergyEntity), [entities]);
  const energyMetricGroups = useMemo(
    () => groupEnergyMetricGroups(metricGroups),
    [metricGroups],
  );

  const energyFavoriteMap = useMemo(() => {
    return favorites.reduce<Map<string, FavoriteEntry>>((acc, favorite) => {
      if (favorite.cardType !== 'energy-metric-panel') return acc;
      const groupId =
        (favorite.config as { groupId?: string; group_id?: string })?.groupId ||
        (favorite.config as { group_id?: string }).group_id;
      if (groupId) {
        acc.set(groupId, favorite);
      }
      return acc;
    }, new Map());
  }, [favorites]);

  const entityFavoriteMap = useMemo(() => {
    return favorites.reduce<Map<string, FavoriteEntry>>((acc, favorite) => {
      if (favorite.cardType !== 'entity') return acc;
      const entityId = favorite.config?.entity_id;
      if (typeof entityId === 'string') {
        acc.set(entityId, favorite);
      }
      return acc;
    }, new Map());
  }, [favorites]);

  const grouped = useMemo(() => {
    return energyEntities.reduce<Record<string, { label: string; items: HaEntity[] }>>(
      (acc, entity) => {
        const areaId = (entity.attributes.area_id as string | undefined) ?? 'unassigned';
        if (!acc[areaId]) {
          const areaName =
            (entity.attributes.area_name as string | undefined) ||
            (areaId === 'unassigned' ? 'Sin zona' : areaId);
          acc[areaId] = { label: areaName, items: [] };
        }
        acc[areaId].items.push(entity);
        return acc;
      },
      {},
    );
  }, [energyEntities]);

  if (isLoading) {
    return (
      <section className="panel">
        <p>Cargando entidades de energía...</p>
      </section>
    );
  }

  if (isError) {
    const message = (error as Error | undefined)?.message ?? 'No pudimos cargar los datos de energía.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section>

      {isLoadingMetricGroups && (
        <section className="panel">
          <p>Sincronizando grupos de energía...</p>
        </section>
      )}

      {metricGroupsError && (
        <section className="panel">
          <p>
            {(metricGroupsErrorMessage as Error | undefined)?.message ||
              'No pudimos cargar los grupos de energía.'}
          </p>
        </section>
      )}

      {!isLoadingMetricGroups && !metricGroupsError && energyMetricGroups.length > 0 && (
        <div className="energy-cards-grid">
          {energyMetricGroups.map((group) => (
            <EnergyMetricGroupCard
              key={group.id}
              group={group}
              isFavorite={energyFavoriteMap.has(group.id)}
              favoriteDisabled={toggleFavorite.isPending}
              onToggleFavorite={() =>
                toggleFavorite.mutate({
                  favorite: energyFavoriteMap.get(group.id),
                  cardType: 'energy-metric-panel',
                  config: { groupId: group.id },
                  title: group.name,
                })
              }
            />
          ))}
        </div>
      )}

      {!isLoadingMetricGroups && !metricGroupsError && energyMetricGroups.length === 0 && (
        <section className="panel">
          <p>
            No encontramos grupos completos de energía (power/voltage/current). Revisa los sensores en Home Assistant.
          </p>
        </section>
      )}

      {Object.entries(grouped).map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.label}</h3>
          <div className="entity-grid">
            {group.items.map((entity) => (
              <EntityCard
                key={entity.entity_id}
                entity={entity}
                areaName={group.label}
                isFavorite={entityFavoriteMap.has(entity.entity_id)}
                onToggleFavorite={(candidate) =>
                  toggleFavorite.mutate({ entity: candidate, favorite: entityFavoriteMap.get(candidate.entity_id) })
                }
                favoriteDisabled={toggleFavorite.isPending}
              />
            ))}
          </div>
        </section>
      ))}

      {energyEntities.length === 0 && (
        <section className="panel">
          <p>No encontramos entidades de energía en Home Assistant todavía.</p>
        </section>
      )}
    </section>
  );
};

import { useMemo } from 'react';
import type { HaEntity, FavoriteEntry } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { useFanPercentage, useFanToggle } from '../hooks/useFanControls';
import { useLightControl } from '../hooks/useLightControl';
import { useClimateModeControl, useClimateTemperatureControl } from '../hooks/useClimateControls';
import { FanCard } from '../components/FanCard';
import { ClimateUnitCard } from '../components/ClimateUnitCard';
import type { LinkedEntityControl } from '../components/LinkedEntitiesSection';
import type { ClimateDeviceGroup } from '../lib/climateGrouping';
import {
  buildClimateDeviceGroups,
  formatClimateDescription,
  formatClimateTemperature,
  isClimate,
  isFan,
  isLight,
} from '../lib/climateGrouping';

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
  const lightControl = useLightControl();
  const climateModeControl = useClimateModeControl();
  const climateTemperatureControl = useClimateTemperatureControl();

  const favoriteMap = useMemo(() => buildFavoriteMap(favorites), [favorites]);
  const relevantEntities = useMemo(
    () => entities.filter((entity) => isFan(entity) || isClimate(entity) || isLight(entity)),
    [entities],
  );
  const deviceGroups = useMemo(() => buildClimateDeviceGroups(relevantEntities), [relevantEntities]);

  const areas = useMemo(() => {
    return deviceGroups.reduce<Record<string, { areaName: string; devices: ClimateDeviceGroup[] }>>(
      (acc, group) => {
        const bucket = acc[group.areaId] ?? { areaName: group.areaName, devices: [] };
        if (!acc[group.areaId]) {
          acc[group.areaId] = bucket;
        }
        if (bucket.areaName === 'Sin zona' && group.areaName !== 'Sin zona') {
          bucket.areaName = group.areaName;
        }
        bucket.devices.push(group);
        return acc;
      },
      {},
    );
  }, [deviceGroups]);

  const orderedAreas = useMemo(() => {
    return Object.entries(areas)
      .map(([areaId, bucket]) => ({ areaId, ...bucket }))
      .map((entry) => ({
        ...entry,
        devices: [...entry.devices].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
      }))
      .sort((a, b) => a.areaName.localeCompare(b.areaName, 'es', { sensitivity: 'base' }));
  }, [areas]);

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
  const handleLightToggle = (entity: HaEntity) => lightControl.mutate(entity.entity_id);
  const handleClimateMode = (entity: HaEntity, mode: string) =>
    climateModeControl.mutate({ entityId: entity.entity_id, mode });
  const handleClimateTemperature = (entity: HaEntity, temperature: number) =>
    climateTemperatureControl.mutate({ entityId: entity.entity_id, temperature });

  const buildLightLinks = (lights: HaEntity[]): LinkedEntityControl[] =>
    lights.map((light) => ({
      entity: light,
      onToggle: handleLightToggle,
      disabled: lightControl.isPending,
      description: 'Luz',
      variant: 'icon',
    }));

  const buildClimateLinks = (climates: HaEntity[]): LinkedEntityControl[] =>
    climates.map((climate) => ({
      entity: climate,
      description: formatClimateDescription(climate),
      stateOverride: formatClimateTemperature(climate),
    }));

  const renderGroupCard = (group: ClimateDeviceGroup) => {
    const linkedLights = buildLightLinks(group.lights);
    if (group.fan) {
      const linkedEntities = [...linkedLights, ...buildClimateLinks(group.climates)];
      return (
        <FanCard
          key={group.key}
          entity={group.fan}
          onToggle={handleFanToggle}
          onChangePercentage={handleFanPercentage}
          disabled={fanToggle.isPending}
          percentageDisabled={fanPercentage.isPending}
          isFavorite={favoriteMap.has(group.fan.entity_id)}
          onToggleFavorite={(candidate) =>
            toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
          }
          favoriteDisabled={toggleFavorite.isPending}
          linkedEntities={linkedEntities}
          linkedEntitiesTitle={linkedEntities.length ? 'Componentes vinculados' : undefined}
        />
      );
    }
    if (group.climates.length > 0) {
      const [primaryClimate, ...extraClimates] = group.climates;
      const linkedEntities = [...linkedLights, ...buildClimateLinks(extraClimates)];
      return (
        <ClimateUnitCard
          key={group.key}
          entity={primaryClimate}
          linkedEntities={linkedEntities}
          isFavorite={favoriteMap.has(primaryClimate.entity_id)}
          onToggleFavorite={(candidate) =>
            toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
          }
          favoriteDisabled={toggleFavorite.isPending}
          onSetMode={handleClimateMode}
          modeDisabled={climateModeControl.isPending}
          onSetTemperature={handleClimateTemperature}
          temperatureDisabled={climateTemperatureControl.isPending}
        />
      );
    }
    return null;
  };

  if (orderedAreas.length === 0) {
    return (
      <section className="panel">
        <p>No encontramos dispositivos de climatización registrados.</p>
      </section>
    );
  }

  return (
    <section>
      {orderedAreas.map((area) => (
        <section key={area.areaId} className="panel entity-group">
          <h3>{area.areaName}</h3>
          <div className="entity-grid">
            {area.devices.map((group) => {
              const card = renderGroupCard(group);
              return card;
            })}
          </div>
        </section>
      ))}
    </section>
  );
};

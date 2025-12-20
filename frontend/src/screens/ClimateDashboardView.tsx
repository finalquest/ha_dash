import { useMemo } from 'react';
import type { HaEntity, FavoriteEntry } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { useFanPercentage, useFanToggle } from '../hooks/useFanControls';
import { useLightControl } from '../hooks/useLightControl';
import { FanCard } from '../components/FanCard';
import { ClimateUnitCard } from '../components/ClimateUnitCard';
import type { LinkedEntityControl } from '../components/LinkedEntitiesSection';
import { parseNumericAttribute } from '../lib/parseNumericAttribute';

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
const isLight = (entity: HaEntity) => entity.entity_id.startsWith('light.');
const NO_AREA_KEY = 'unassigned';

const getAreaId = (entity: HaEntity) => (entity.attributes.area_id as string | undefined) ?? NO_AREA_KEY;
const getAreaName = (entity: HaEntity) => (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
const getFriendlyName = (entity: HaEntity) =>
  (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;

const KEY_PREFIXES = ['light', 'lights', 'luz'];
const KEY_SUFFIXES = ['light', 'lights', 'luz', 'fan', 'ventilador', 'switch', 'ac', 'aire', 'hvac', 'climate'];

const sanitizeSlug = (raw: string) =>
  raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const stripPrefix = (slug: string) => {
  for (const prefix of KEY_PREFIXES) {
    if (slug.startsWith(`${prefix}_`)) {
      return slug.slice(prefix.length + 1);
    }
  }
  return slug;
};

const stripSuffix = (slug: string) => {
  for (const suffix of KEY_SUFFIXES) {
    if (slug.endsWith(`_${suffix}`)) {
      return slug.slice(0, Math.max(0, slug.length - suffix.length - 1));
    }
  }
  return slug;
};

const buildGroupKey = (entity: HaEntity) => {
  const deviceId = entity.attributes.device_id;
  if (typeof deviceId === 'string' && deviceId.trim().length > 0) {
    return deviceId;
  }
  const areaId = getAreaId(entity);
  const objectId = entity.entity_id.split('.')[1] ?? entity.entity_id;
  const objectSlug = stripSuffix(stripPrefix(sanitizeSlug(objectId)));
  const friendlySlug = stripSuffix(stripPrefix(sanitizeSlug(getFriendlyName(entity))));
  const primarySlug = objectSlug || friendlySlug;
  return `${primarySlug || entity.entity_id}::${areaId}`;
};

interface ClimateDeviceGroup {
  key: string;
  name: string;
  areaId: string;
  areaName: string;
  fan?: HaEntity;
  climates: HaEntity[];
  lights: HaEntity[];
}

const buildDeviceGroups = (entities: HaEntity[]): ClimateDeviceGroup[] => {
  const registry = new Map<string, ClimateDeviceGroup>();
  entities.forEach((entity) => {
    const key = buildGroupKey(entity);
    const existing = registry.get(key);
    const next: ClimateDeviceGroup =
      existing ?? {
        key,
        name: getFriendlyName(entity),
        areaId: getAreaId(entity),
        areaName: getAreaName(entity),
        fan: undefined,
        climates: [],
        lights: [],
      };
    if (!existing) {
      registry.set(key, next);
    } else {
      if (next.areaName === 'Sin zona') {
        next.areaName = getAreaName(entity);
      }
      if (!next.name) {
        next.name = getFriendlyName(entity);
      }
    }
    if (isFan(entity)) {
      next.fan = entity;
    } else if (isClimate(entity)) {
      next.climates.push(entity);
    } else if (isLight(entity)) {
      next.lights.push(entity);
    }
  });

  return Array.from(registry.values()).filter((group) => group.fan || group.climates.length > 0);
};

const formatClimateTemperature = (entity: HaEntity) => {
  const current = parseNumericAttribute(entity.attributes.current_temperature);
  const unit =
    (entity.attributes.temperature_unit as string | undefined) ??
    (entity.attributes.unit_of_measurement as string | undefined) ??
    '°C';
  if (typeof current === 'number') {
    return `${current.toFixed(1)}${unit}`;
  }
  const numericState = parseNumericAttribute(entity.state);
  if (typeof numericState === 'number') {
    return `${numericState.toFixed(1)}${unit}`;
  }
  return `${entity.state}`;
};

const formatClimateDescription = (entity: HaEntity) => {
  const hvacStatus =
    (entity.attributes.hvac_action as string | undefined) ??
    (entity.attributes.hvac_mode as string | undefined);
  if (hvacStatus) {
    return hvacStatus;
  }
  return 'HVAC';
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

  const favoriteMap = useMemo(() => buildFavoriteMap(favorites), [favorites]);
  const relevantEntities = useMemo(
    () => entities.filter((entity) => isFan(entity) || isClimate(entity) || isLight(entity)),
    [entities],
  );
  const deviceGroups = useMemo(() => buildDeviceGroups(relevantEntities), [relevantEntities]);

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

  const buildLightLinks = (lights: HaEntity[]): LinkedEntityControl[] =>
    lights.map((light) => ({
      entity: light,
      onToggle: handleLightToggle,
      disabled: lightControl.isPending,
      description: 'Luz',
      variant: 'icon',
      icon: '💡',
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

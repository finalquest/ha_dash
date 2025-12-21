import type { HaEntity } from '../api/types';
import { parseNumericAttribute } from './parseNumericAttribute';

export const isFan = (entity: HaEntity) => entity.entity_id.startsWith('fan.');
export const isClimate = (entity: HaEntity) => entity.entity_id.startsWith('climate.');
export const isLight = (entity: HaEntity) => entity.entity_id.startsWith('light.');
export const NO_AREA_KEY = 'unassigned';

export const getAreaId = (entity: HaEntity) => (entity.attributes.area_id as string | undefined) ?? NO_AREA_KEY;
export const getAreaName = (entity: HaEntity) => (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
export const getFriendlyName = (entity: HaEntity) =>
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

export const buildGroupKey = (entity: HaEntity) => {
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

export interface ClimateDeviceGroup {
  key: string;
  name: string;
  areaId: string;
  areaName: string;
  fan?: HaEntity;
  climates: HaEntity[];
  lights: HaEntity[];
}

export const buildClimateDeviceGroups = (entities: HaEntity[]): ClimateDeviceGroup[] => {
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

export const buildEntityGroupMap = (groups: ClimateDeviceGroup[]) => {
  const map = new Map<string, ClimateDeviceGroup>();
  groups.forEach((group) => {
    if (group.fan) {
      map.set(group.fan.entity_id, group);
    }
    group.climates.forEach((entity) => map.set(entity.entity_id, group));
    group.lights.forEach((entity) => map.set(entity.entity_id, group));
  });
  return map;
};

export const formatClimateTemperature = (entity: HaEntity) => {
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

export const formatClimateDescription = (entity: HaEntity) => {
  const hvacStatus =
    (entity.attributes.hvac_action as string | undefined) ??
    (entity.attributes.hvac_mode as string | undefined);
  if (hvacStatus) {
    return hvacStatus;
  }
  return 'HVAC';
};

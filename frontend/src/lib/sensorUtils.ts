import type { HaEntity } from '../api/types';
import { getAreaId, getAreaName } from './climateGrouping';

const SENSOR_DOMAINS = new Set(['sensor', 'binary_sensor']);

export const isSensorEntity = (entity: HaEntity) => SENSOR_DOMAINS.has(entity.entity_id.split('.')[0]);

export type SensorKind = 'door' | 'window' | 'motion' | 'occupancy' | 'battery' | 'temperature' | 'default';

export const getSensorKind = (entity: HaEntity): SensorKind => {
  const deviceClass = (entity.attributes.device_class as string | undefined) ?? '';
  switch (deviceClass) {
    case 'door':
      return 'door';
    case 'window':
      return 'window';
    case 'motion':
      return 'motion';
    case 'occupancy':
      return 'occupancy';
    case 'battery':
      return 'battery';
    case 'temperature':
      return 'temperature';
    default:
      return 'default';
  }
};

export const formatSensorState = (entity: HaEntity) => {
  const deviceClass = (entity.attributes.device_class as string | undefined) ?? '';
  const state = (entity.state ?? '').toLowerCase();
  if (deviceClass === 'door' || deviceClass === 'window') {
    return state === 'on' ? 'Abierta' : 'Cerrada';
  }
  if (deviceClass === 'motion') {
    return state === 'on' ? 'Movimiento' : 'Sin movimiento';
  }
  if (deviceClass === 'occupancy') {
    return state === 'on' ? 'Ocupado' : 'Libre';
  }
  if (deviceClass === 'battery') {
    const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? '%';
    return `${entity.state}${unit ? ` ${unit}` : ''}`;
  }
  if (deviceClass === 'temperature') {
    const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? '°C';
    return `${entity.state} ${unit}`;
  }
  return entity.state;
};

export const buildSensorGroups = (entities: HaEntity[]) => {
  return entities.reduce<Record<string, { label: string; items: HaEntity[] }>>((acc, entity) => {
    const areaId = getAreaId(entity);
    const label = getAreaName(entity);
    if (!acc[areaId]) {
      acc[areaId] = { label, items: [] };
    }
    acc[areaId].items.push(entity);
    return acc;
  }, {});
};

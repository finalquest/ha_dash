import { HomeAssistantEntityState } from '../ha/types';
import { MetricGroupCandidate, MetricGroupEntity, MetricType } from './types';

const METRIC_TYPES: MetricType[] = ['power', 'voltage', 'current'];

const METRIC_SUFFIXES: Record<MetricType, string[]> = {
  power: ['_power', '_energy_power'],
  voltage: ['_voltage'],
  current: ['_current', '_energy_current'],
};

const METRIC_NAME_SUFFIXES: Record<MetricType, RegExp> = {
  power: /\s+power$/i,
  voltage: /\s+voltage$/i,
  current: /\s+current$/i,
};

const metricTypeFromState = (state: HomeAssistantEntityState): MetricType | undefined => {
  const deviceClass = String(state.attributes?.device_class || '').toLowerCase();
  if (METRIC_TYPES.includes(deviceClass as MetricType)) {
    return deviceClass as MetricType;
  }

  const entityId = state.entity_id.toLowerCase();
  const suffixMatch = METRIC_TYPES.find((type) =>
    METRIC_SUFFIXES[type].some((suffix) => entityId.endsWith(suffix)),
  );
  return suffixMatch;
};

const normalizeBaseId = (entityId: string, metricType: MetricType): string => {
  const [, raw] = entityId.split('.', 2);
  if (!raw) return entityId;

  const lower = raw.toLowerCase();
  const suffix = METRIC_SUFFIXES[metricType].find((candidate) => lower.endsWith(candidate));
  if (!suffix) return raw;
  return raw.slice(0, raw.length - suffix.length);
};

const deriveFriendlyName = (
  state: HomeAssistantEntityState,
  metricType: MetricType,
  fallback: string,
) => {
  const friendlyName = state.attributes?.friendly_name;
  if (typeof friendlyName === 'string' && friendlyName.trim().length > 0) {
    return friendlyName.replace(METRIC_NAME_SUFFIXES[metricType], '').trim() || friendlyName;
  }
  return fallback;
};

const buildGroupEntity = (
  state: HomeAssistantEntityState,
  metricType: MetricType,
  baseName: string,
): MetricGroupEntity => ({
  entityId: state.entity_id,
  metricType,
  friendlyName: deriveFriendlyName(state, metricType, baseName),
  areaId: state.attributes?.area_id as string | undefined,
});

export const inferMetricGroups = (
  states: HomeAssistantEntityState[],
  options: { minMetrics?: number } = {},
): MetricGroupCandidate[] => {
  const { minMetrics = 2 } = options;
  const groups = new Map<string, MetricGroupCandidate>();

  states.forEach((state) => {
    const metricType = metricTypeFromState(state);
    if (!metricType) {
      return;
    }

    const baseId = normalizeBaseId(state.entity_id, metricType);
    const groupId = `${state.attributes?.device_id || ''}:${baseId}` || baseId;
    const existing = groups.get(groupId);
    const entity = buildGroupEntity(state, metricType, baseId);

    if (!existing) {
      groups.set(groupId, {
        id: groupId,
        baseId,
        name: entity.friendlyName,
        areaId: entity.areaId,
        metrics: { [metricType]: entity },
      });
      return;
    }

    existing.metrics[metricType] = entity;
    if (!existing.areaId && entity.areaId) {
      existing.areaId = entity.areaId;
    }
    if (!existing.name && entity.friendlyName) {
      existing.name = entity.friendlyName;
    }
  });

  return Array.from(groups.values())
    .filter((group) => Object.keys(group.metrics).length >= minMetrics)
    .sort((a, b) => a.name.localeCompare(b.name));
};

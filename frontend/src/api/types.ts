export interface HaEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    area_id?: string;
    area_name?: string;
    device_id?: string;
    unit_of_measurement?: string;
  };
  last_changed: string;
  last_updated: string;
}

export type AreaEntry = string | { area_id: string; name: string };

export interface EntitiesResponse {
  ok: boolean;
  entities: HaEntity[];
}

export interface AreasResponse {
  ok: boolean;
  areas: AreaEntry[];
}

export type MetricType = 'power' | 'voltage' | 'current';

export interface MetricGroupEntityRef {
  entityId: string;
  metricType: MetricType;
  friendlyName: string;
  areaId?: string;
}

export interface MetricGroup {
  id: string;
  name: string;
  areaId?: string;
  metrics: Partial<Record<MetricType, MetricGroupEntityRef>>;
}

export interface MetricGroupsResponse {
  ok: boolean;
  groups: MetricGroup[];
}

export interface MetricGroupStateMetric {
  entityId: string;
  metricType: MetricType;
  friendlyName?: string;
  value: string | null;
  unit?: string;
  lastChanged?: string;
}

export interface MetricGroupStateResponse {
  ok: boolean;
  group: MetricGroup;
  metrics: Partial<Record<MetricType, MetricGroupStateMetric>>;
}

export interface EntityHistoryPoint {
  timestamp: number;
  state: string;
  value: number | null;
  unit?: string;
}

export interface EntityHistoryResponse {
  ok: boolean;
  entityId: string;
  points: EntityHistoryPoint[];
}

export type MetricType = 'power' | 'voltage' | 'current';

export interface MetricGroupEntity {
  entityId: string;
  metricType: MetricType;
  friendlyName: string;
  areaId?: string;
}

export interface MetricGroupCandidate {
  id: string;
  baseId: string;
  name: string;
  areaId?: string;
  metrics: Partial<Record<MetricType, MetricGroupEntity>>;
}

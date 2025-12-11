import { randomUUID } from 'crypto';
import { getDb } from '../db/connection';
import { MetricGroupCandidate, MetricGroupEntity, MetricType } from '../metrics/types';

const db = getDb();

interface MetricGroupRow {
  id: string;
  base_id: string;
  name: string;
  area_id?: string | null;
  device_id?: string | null;
  metadata?: string | null;
}

interface MetricGroupEntityRow {
  group_id: string;
  metric_type: string;
  entity_id: string;
  friendly_name?: string | null;
  area_id?: string | null;
}

export interface PersistedMetricGroup {
  id: string;
  baseId: string;
  name: string;
  areaId?: string;
  deviceId?: string;
  metrics: Partial<Record<MetricType, MetricGroupEntity>>;
}

const selectGroupByBaseId = db.prepare('SELECT * FROM metric_groups WHERE base_id = ?');

const insertGroup = db.prepare(
  'INSERT INTO metric_groups (id, base_id, name, area_id, device_id, metadata, created_at, updated_at) VALUES (@id, @base_id, @name, @area_id, @device_id, @metadata, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
);

const updateGroup = db.prepare(
  'UPDATE metric_groups SET name = @name, area_id = @area_id, device_id = @device_id, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
);

const deleteGroupEntities = db.prepare('DELETE FROM metric_group_entities WHERE group_id = ?');

const insertGroupEntity = db.prepare(
  'INSERT INTO metric_group_entities (group_id, metric_type, entity_id, friendly_name, area_id) VALUES (@group_id, @metric_type, @entity_id, @friendly_name, @area_id)'
);

const selectAllGroups = db.prepare('SELECT * FROM metric_groups ORDER BY name');

const selectGroupById = db.prepare('SELECT * FROM metric_groups WHERE id = ?');

const selectEntitiesByGroup = db.prepare('SELECT * FROM metric_group_entities WHERE group_id = ?');

const mapRowToGroup = (row: MetricGroupRow, entities: MetricGroupEntityRow[]): PersistedMetricGroup => {
  const metrics: Partial<Record<MetricType, MetricGroupEntity>> = {};
  entities.forEach((entity) => {
    if (!['power', 'voltage', 'current'].includes(entity.metric_type)) {
      return;
    }
    metrics[entity.metric_type as MetricType] = {
      entityId: entity.entity_id,
      metricType: entity.metric_type as MetricType,
      friendlyName: entity.friendly_name || row.name,
      areaId: entity.area_id ?? undefined,
    };
  });

  return {
    id: row.id,
    baseId: row.base_id,
    name: row.name,
    areaId: row.area_id ?? undefined,
    deviceId: row.device_id ?? undefined,
    metrics,
  };
};

const transactionSync = db.transaction((groups: MetricGroupCandidate[]) => {
  groups.forEach((candidate) => {
    const existing = selectGroupByBaseId.get(candidate.baseId) as MetricGroupRow | undefined;
    const payload = {
      id: existing?.id || randomUUID(),
      base_id: candidate.baseId,
      name: candidate.name,
      area_id: candidate.areaId ?? null,
      device_id: candidate.id.split(':')[0] || null,
      metadata: null,
    };

    if (existing) {
      updateGroup.run(payload);
      deleteGroupEntities.run(existing.id);
    } else {
      insertGroup.run(payload);
    }

    Object.entries(candidate.metrics).forEach(([metricType, entity]) => {
      if (!entity) return;
      insertGroupEntity.run({
        group_id: payload.id,
        metric_type: metricType,
        entity_id: entity.entityId,
        friendly_name: entity.friendlyName,
        area_id: entity.areaId ?? null,
      });
    });
  });
});

export const syncMetricGroups = (groups: MetricGroupCandidate[]) => {
  transactionSync(groups);
};

export const listPersistedGroups = (): PersistedMetricGroup[] => {
  const rows = selectAllGroups.all() as MetricGroupRow[];
  return rows.map((row) => {
    const entities = selectEntitiesByGroup.all(row.id) as MetricGroupEntityRow[];
    return mapRowToGroup(row, entities);
  });
};

export const getPersistedGroupById = (id: string): PersistedMetricGroup | undefined => {
  const row = selectGroupById.get(id) as MetricGroupRow | undefined;
  if (!row) return undefined;
  const entities = selectEntitiesByGroup.all(id) as MetricGroupEntityRow[];
  return mapRowToGroup(row, entities);
};

import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';
import { inferMetricGroups } from '../metrics/inference';
import {
  listPersistedGroups,
  syncMetricGroups,
  getPersistedGroupById,
} from '../repos/metricGroupsRepo';

const mapPersistedToResponse = (group: ReturnType<typeof listPersistedGroups>[number]) => ({
  id: group.id,
  name: group.name,
  areaId: group.areaId,
  metrics: group.metrics,
});

export const listMetricGroupsHandler = async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const client = createHomeAssistantClient(config);
    const states = await client.getStates();
    const inferred = inferMetricGroups(states);
    syncMetricGroups(inferred);
    const persisted = listPersistedGroups();

    res.json({ ok: true, groups: persisted.map(mapPersistedToResponse) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, groups: [], error: message });
  }
};

export const metricGroupStateHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = getConfig();
    const client = createHomeAssistantClient(config);
    const states = await client.getStates();
    const inferred = inferMetricGroups(states);
    syncMetricGroups(inferred);
    const group = getPersistedGroupById(id);

    if (!group) {
      return res.status(404).json({ ok: false, error: 'Metric group not found' });
    }

    const stateByEntity = new Map(states.map((state) => [state.entity_id, state]));
    const metrics = Object.entries(group.metrics).reduce(
      (acc, [metricType, entity]) => {
        if (!entity) return acc;
        const state = stateByEntity.get(entity.entityId);
        acc[metricType] = {
          entityId: entity.entityId,
          metricType,
          friendlyName: entity.friendlyName,
          value: state?.state ?? null,
          unit:
            typeof state?.attributes?.unit_of_measurement === 'string'
              ? state?.attributes?.unit_of_measurement
              : undefined,
          lastChanged: state?.last_changed,
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );

    res.json({ ok: true, group: mapPersistedToResponse(group), metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, error: message });
  }
};

const router = Router();

router.get('/', listMetricGroupsHandler);
router.get('/:id/state', metricGroupStateHandler);

export default router;

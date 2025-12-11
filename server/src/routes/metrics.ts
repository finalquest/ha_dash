import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';
import { inferMetricGroups } from '../metrics/inference';

const mapGroupToResponse = (group: ReturnType<typeof inferMetricGroups>[number]) => ({
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
    const groups = inferMetricGroups(states);

    res.json({ ok: true, groups: groups.map(mapGroupToResponse) });
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
    const groups = inferMetricGroups(states);
    const group = groups.find((candidate) => candidate.id === id);

    if (!group) {
      return res.status(404).json({ ok: false, error: 'Metric group not found' });
    }

    const stateByEntity = new Map(states.map((state) => [state.entity_id, state]));
    const metrics = Object.entries(group.metrics).reduce(
      (acc, [metricType, entity]) => {
        const state = stateByEntity.get(entity.entityId);
        acc[metricType] = {
          entityId: entity.entityId,
          metricType,
          friendlyName: entity.friendlyName,
          value: state?.state ?? null,
          unit: typeof state?.attributes?.unit_of_measurement === 'string'
            ? state?.attributes?.unit_of_measurement
            : undefined,
          lastChanged: state?.last_changed,
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );

    res.json({ ok: true, group: mapGroupToResponse(group), metrics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, error: message });
  }
};

const router = Router();

router.get('/', listMetricGroupsHandler);
router.get('/:id/state', metricGroupStateHandler);

export default router;

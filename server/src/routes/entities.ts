import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

export const entitiesHandler = async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const haClient = createHomeAssistantClient(config);
    const [entities, areas] = await Promise.all([haClient.getStates(), haClient.getAreas()]);

    let metadataMap: Record<string, { area_id?: string; device_id?: string }> = {};
    try {
      metadataMap = await haClient.getEntityMetadata();
    } catch (metadataError) {
      // eslint-disable-next-line no-console
      console.warn('Unable to load entity metadata', metadataError);
    }

    const areaNameMap = new Map<string, string>(areas.map((area) => [area.area_id, area.name]));

    const enriched = entities.map((entity) => {
      const metadata = metadataMap[entity.entity_id];
      const areaId = metadata?.area_id ?? (entity.attributes.area_id as string | undefined);
      const areaName = areaId ? areaNameMap.get(areaId) ?? areaId : undefined;
      const deviceId = metadata?.device_id ?? (entity.attributes.device_id as string | undefined);

      return {
        ...entity,
        attributes: {
          ...entity.attributes,
          area_id: areaId ?? null,
          area_name: areaName,
          device_id: deviceId ?? null,
        },
      };
    });

    const missingArea = enriched.filter((entity) => !entity.attributes.area_id);
    if (missingArea.length) {
      // eslint-disable-next-line no-console
      console.warn(
        '[entities] entities without area_id',
        missingArea.length,
        'example ids:',
        missingArea.slice(0, 5).map((entity) => entity.entity_id),
      );
    } else {
      // eslint-disable-next-line no-console
      console.info('[entities] all entities resolved with area_id');
    }

    res.json({ ok: true, entities: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, error: message });
  }
};

const router = Router();

router.get('/', entitiesHandler);

export default router;

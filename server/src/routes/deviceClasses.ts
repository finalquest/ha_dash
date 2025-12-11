import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

type DeviceClassResponse = {
  ok: boolean;
  deviceClasses: string[];
  error?: string;
};

export const deviceClassesHandler = async (_req: Request, res: Response<DeviceClassResponse>) => {
  try {
    const config = getConfig();
    const haClient = createHomeAssistantClient(config);
    const states = await haClient.getStates();

    const classes = new Set<string>();
    states.forEach((entity) => {
      const deviceClass = entity.attributes?.device_class;
      if (typeof deviceClass === 'string' && deviceClass.trim()) {
        classes.add(deviceClass);
      }
    });

    res.json({ ok: true, deviceClasses: Array.from(classes).sort() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, deviceClasses: [], error: message });
  }
};

const router = Router();

router.get('/', deviceClassesHandler);

export default router;

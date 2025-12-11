import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

export const entitiesHandler = async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const haClient = createHomeAssistantClient(config);
    const entities = await haClient.getStates();

    res.json({ ok: true, entities });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, error: message });
  }
};

const router = Router();

router.get('/', entitiesHandler);

export default router;

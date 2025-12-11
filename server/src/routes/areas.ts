import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

export const areasHandler = async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const haClient = createHomeAssistantClient(config);
    const areas = await haClient.getAreas();

    res.json({ ok: true, areas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, areas: [], error: message });
  }
};

const router = Router();

router.get('/', areasHandler);

export default router;

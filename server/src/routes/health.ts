import type { Request, Response } from 'express';
import { Router } from 'express';
import { ConfigError, getConfig } from '../config';
import { createHomeAssistantClient, HomeAssistantError } from '../ha/client';

export const healthHandler = async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const haClient = createHomeAssistantClient(config);
    const haInfo = await haClient.health();

    res.json({ ok: true, ha: haInfo });
  } catch (error) {
    if (error instanceof ConfigError) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (error instanceof HomeAssistantError) {
      const statusCode = error.status && error.status >= 500 ? 502 : error.status ?? 500;
      return res.status(statusCode).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: 'Unexpected error while checking health' });
  }
};

const router = Router();

router.get('/', healthHandler);

export default router;

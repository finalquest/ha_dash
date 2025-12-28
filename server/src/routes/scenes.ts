import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

const router = Router();

router.post('/:entityId/activate', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  try {
    const config = getConfig();
    const client = createHomeAssistantClient(config);
    await client.callService('scene', 'turn_on', { entity_id: entityId });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la acción';
    res.status(400).json({ ok: false, error: message });
  }
});

export default router;

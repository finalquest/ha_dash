import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

const getClient = () => createHomeAssistantClient(getConfig());

const handleError = (error: unknown, res: Response) => {
  const message = error instanceof Error ? error.message : 'No se pudo ejecutar la acción';
  res.status(400).json({ ok: false, error: message });
};

const router = Router();

router.post('/:entityId/toggle', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  try {
    const client = getClient();
    await client.callService('fan', 'toggle', { entity_id: entityId });
    res.json({ ok: true });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:entityId/percentage', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  const percentageValue = (req.body?.percentage ?? req.body?.percentage_value) as unknown;
  const numericPercentage = typeof percentageValue === 'number' ? percentageValue : Number(percentageValue);
  if (!Number.isFinite(numericPercentage)) {
    return res.status(400).json({ ok: false, error: 'percentage debe ser un número entre 0 y 100' });
  }
  if (numericPercentage < 0 || numericPercentage > 100) {
    return res.status(400).json({ ok: false, error: 'percentage debe ser un número entre 0 y 100' });
  }

  try {
    const client = getClient();
    await client.callService('fan', 'set_percentage', {
      entity_id: entityId,
      percentage: Math.round(numericPercentage),
    });
    res.json({ ok: true });
  } catch (error) {
    handleError(error, res);
  }
});

export default router;

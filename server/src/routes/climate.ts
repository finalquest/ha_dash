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

router.post('/:entityId/mode', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  const modeValue = (req.body?.mode ?? req.body?.hvac_mode) as string | undefined;
  const hvacMode = typeof modeValue === 'string' ? modeValue.trim() : '';
  if (!hvacMode) {
    return res.status(400).json({ ok: false, error: 'mode debe ser un string no vacío' });
  }
  try {
    const client = getClient();
    await client.callService('climate', 'set_hvac_mode', {
      entity_id: entityId,
      hvac_mode: hvacMode,
    });
    res.json({ ok: true });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/:entityId/temperature', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  const temperatureValue =
    (req.body?.temperature ?? req.body?.target_temperature ?? req.body?.target_temp) as unknown;
  const numericTemperature =
    typeof temperatureValue === 'number' ? temperatureValue : Number(temperatureValue);

  if (!Number.isFinite(numericTemperature)) {
    return res.status(400).json({ ok: false, error: 'temperature debe ser un número' });
  }

  try {
    const client = getClient();
    await client.callService('climate', 'set_temperature', {
      entity_id: entityId,
      temperature: numericTemperature,
    });
    res.json({ ok: true });
  } catch (error) {
    handleError(error, res);
  }
});

export default router;

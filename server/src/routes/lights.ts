import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

const resolveDomain = (entityId: string) => {
  const [domain] = entityId.split('.', 2);
  if (domain === 'light' || domain === 'switch') {
    return domain;
  }
  throw new Error('Solo se pueden controlar entidades de los dominios light o switch');
};

const invokeService = async (
  entityId: string,
  service: 'turn_on' | 'turn_off' | 'toggle',
  res: Response,
) => {
  try {
    const domain = resolveDomain(entityId);
    const config = getConfig();
    const client = createHomeAssistantClient(config);
    await client.callService(domain, service, { entity_id: entityId });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la acción';
    res.status(400).json({ ok: false, error: message });
  }
};

const router = Router();

router.post('/:entityId/toggle', (req: Request, res: Response) => {
  const { entityId } = req.params;
  void invokeService(entityId, 'toggle', res);
});

router.post('/:entityId/on', (req: Request, res: Response) => {
  const { entityId } = req.params;
  void invokeService(entityId, 'turn_on', res);
});

router.post('/:entityId/off', (req: Request, res: Response) => {
  const { entityId } = req.params;
  void invokeService(entityId, 'turn_off', res);
});

router.post('/:entityId/brightness', async (req: Request, res: Response) => {
  const { entityId } = req.params;
  try {
    const domain = resolveDomain(entityId);
    if (domain !== 'light') {
      throw new Error('Solo se puede ajustar el brillo de entidades light');
    }
    const rawBrightness = (req.body?.brightness ?? req.body?.brightness_value) as unknown;
    const rawPercentage = (req.body?.percentage ?? req.body?.brightness_pct) as unknown;
    let numericBrightness =
      typeof rawBrightness === 'number' ? rawBrightness : Number.isFinite(Number(rawBrightness)) ? Number(rawBrightness) : undefined;
    if (numericBrightness === undefined || Number.isNaN(numericBrightness)) {
      const numericPercentage =
        typeof rawPercentage === 'number'
          ? rawPercentage
          : Number.isFinite(Number(rawPercentage))
            ? Number(rawPercentage)
            : undefined;
      if (numericPercentage === undefined || Number.isNaN(numericPercentage)) {
        return res
          .status(400)
          .json({ ok: false, error: 'brightness (0-255) o percentage (0-100) deben ser numéricos' });
      }
      numericBrightness = Math.round(Math.max(0, Math.min(100, numericPercentage)) * 2.55);
    }
    const brightness = Math.max(0, Math.min(255, Math.round(numericBrightness)));
    const config = getConfig();
    const client = createHomeAssistantClient(config);
    if (brightness <= 0) {
      await client.callService(domain, 'turn_off', { entity_id: entityId });
    } else {
      await client.callService(domain, 'turn_on', {
        entity_id: entityId,
        brightness,
      });
    }
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la acción';
    res.status(400).json({ ok: false, error: message });
  }
});

export default router;

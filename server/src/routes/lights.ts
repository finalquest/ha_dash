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

export default router;

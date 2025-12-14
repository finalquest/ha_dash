import type { Request, Response } from 'express';
import { Router } from 'express';
import { getEventHub } from '../ha/events';

const router = Router();

router.get('/stream', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res.flushHeaders as (() => void) | undefined)?.call(res);

  const hub = getEventHub();

  const sendEvent = (payload: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const handleStateChange = (event: { entity_id: string; new_state: unknown; old_state: unknown }) => {
    sendEvent({ type: 'state_changed', ...event });
  };

  const handleStatus = (status: { online: boolean }) => {
    sendEvent({ type: 'status', ...status });
  };

  hub.on('state_changed', handleStateChange);
  hub.on('status', handleStatus);

  sendEvent({ type: 'status', online: hub.isConnected() });

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  _req.on('close', () => {
    clearInterval(heartbeat);
    hub.off('state_changed', handleStateChange);
    hub.off('status', handleStatus);
  });
});

export default router;

import type { Request, Response } from 'express';
import { Router } from 'express';
import { getConfig } from '../config';
import { createHomeAssistantClient } from '../ha/client';

const DEFAULT_HOURS = 3;
const DEFAULT_INTERVAL_MINUTES = 5;

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sampleHistory = (
  entries: { last_changed: string; state: string; attributes: Record<string, unknown> }[],
  intervalMinutes: number,
) => {
  if (entries.length === 0) return [];
  const intervalMs = intervalMinutes * 60 * 1000;
  let lastTimestamp = 0;
  return entries.reduce((acc, entry) => {
    const timestamp = new Date(entry.last_changed).getTime();
    if (timestamp - lastTimestamp < intervalMs && acc.length > 0) {
      return acc;
    }
    lastTimestamp = timestamp;
    const numericValue = Number.parseFloat(entry.state);
    acc.push({
      timestamp,
      state: entry.state,
      value: Number.isFinite(numericValue) ? numericValue : null,
      unit: typeof entry.attributes?.unit_of_measurement === 'string'
        ? (entry.attributes.unit_of_measurement as string)
        : undefined,
    });
    return acc;
  }, [] as Array<{ timestamp: number; state: string; value: number | null; unit?: string }>);
};

export const entityHistoryHandler = async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const hours = parseNumber(req.query.hours as string, DEFAULT_HOURS);
    const intervalMinutes = parseNumber(
      req.query.intervalMinutes as string,
      DEFAULT_INTERVAL_MINUTES,
    );

    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

    const config = getConfig();
    const client = createHomeAssistantClient(config);
    const historyEntries = await client.getHistory(entityId, start, end);
    const sampled = sampleHistory(historyEntries, intervalMinutes);

    res.json({ ok: true, entityId, points: sampled });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, points: [], error: message });
  }
};

const router = Router({ mergeParams: true });

router.get('/', entityHistoryHandler);

export default router;

import type { Request, Response } from 'express';
import { Router } from 'express';
import { deleteFavorite, listFavorites, reorderFavorites, upsertFavorite } from '../repos/favoritesRepo';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const favorites = listFavorites(req.query.dashboardId as string | undefined);
  res.json({ ok: true, favorites });
});

router.post('/', (req: Request, res: Response) => {
  const { id, cardType, config, title, orderIndex, dashboardId } = req.body;
  if (!cardType || !config) {
    return res.status(400).json({ ok: false, error: 'cardType and config are required' });
  }

  try {
    const favorite = upsertFavorite({ id, cardType, config, title, orderIndex, dashboardId });
    res.json({ ok: true, favorite });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save favorite';
    res.status(500).json({ ok: false, error: message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  deleteFavorite(req.params.id);
  res.status(204).send();
});

router.put('/reorder', (req: Request, res: Response) => {
  const order = req.body?.order;
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ ok: false, error: 'order must be a non-empty array' });
  }
  try {
    reorderFavorites(order as string[]);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder favorites';
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;

import type { Request, Response } from 'express';
import { Router } from 'express';
import { deleteFavorite, listFavorites, upsertFavorite } from '../repos/favoritesRepo';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const favorites = listFavorites();
  res.json({ ok: true, favorites });
});

router.post('/', (req: Request, res: Response) => {
  const { id, cardType, config, title, orderIndex } = req.body;
  if (!cardType || !config) {
    return res.status(400).json({ ok: false, error: 'cardType and config are required' });
  }

  try {
    const favorite = upsertFavorite({ id, cardType, config, title, orderIndex });
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

export default router;

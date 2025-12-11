import type { Request, Response } from 'express';
import favoritesRouter from '../favorites';
import { getDb } from '../../db/connection';

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
  } as Response & { statusCode: number; body: unknown };

  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });

  res.send = jest.fn().mockImplementation((payload?: unknown) => {
    res.body = payload;
    return res;
  });

  return res;
};

const runHandler = async (
  method: 'get' | 'post' | 'delete',
  path: '/' | '/:id',
  options: { body?: Record<string, unknown>; params?: Record<string, string> } = {},
) => {
  const handlers = favoritesRouter.stack
    .filter((layer) => layer.route?.path === path)
    .flatMap((layer) => layer.route!.stack)
    .filter((stackItem) => stackItem.method === method);

  if (handlers.length === 0) {
    throw new Error(`Handler for ${method} ${path} not found`);
  }

  const handler = handlers[0].handle;
  const req = {
    body: options.body ?? {},
    params: options.params ?? {},
    query: {},
  } as unknown as Request;
  const res = createMockResponse();
  await handler(req, res, () => undefined);
  return res;
};

describe('favorites routes', () => {
  beforeEach(() => {
    const db = getDb();
    db.exec('DELETE FROM favorites');
  });

  it('creates and lists favorites', async () => {
    const resPost = await runHandler('post', '/', {
      body: {
        cardType: 'energy-metric-panel',
        config: { groupId: 'uuid', historyMetric: 'power' },
        title: 'Planta baja',
      },
    });

    expect(resPost.statusCode).toBe(200);
    const listRes = await runHandler('get', '/');
    const body = listRes.body as { favorites: Array<{ cardType: string; id: string }> };
    expect(body.favorites).toHaveLength(1);
    expect(body.favorites[0].cardType).toBe('energy-metric-panel');

    await runHandler('delete', '/:id', { params: { id: body.favorites[0].id } });
    const afterDelete = await runHandler('get', '/');
    expect((afterDelete.body as { favorites: unknown[] }).favorites).toHaveLength(0);
  });
});

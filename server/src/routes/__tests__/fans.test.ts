import type { Request, Response } from 'express';
import fansRouter from '../fans';

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test',
    haToken: 'token',
    port: 4000,
  }),
}));

jest.mock('../../ha/client', () => {
  const mockCallService = jest.fn();
  return {
    createHomeAssistantClient: jest.fn().mockReturnValue({
      callService: mockCallService,
    }),
    mockCallService,
  };
});

const { mockCallService } = jest.requireMock('../../ha/client') as {
  mockCallService: jest.Mock;
};

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

  return res;
};

const runHandler = async (
  path: '/:entityId/toggle' | '/:entityId/percentage',
  options: { entityId?: string; body?: Record<string, unknown> } = {},
) => {
  const layer = fansRouter.stack.find((stack) => stack.route?.path === path);
  if (!layer) {
    throw new Error(`Handler for ${path} not found`);
  }
  const handler = layer.route!.stack[0].handle;
  const req = {
    params: { entityId: options.entityId ?? 'fan.office' },
    body: options.body ?? {},
  } as unknown as Request;
  const res = createMockResponse();
  await handler(req, res, () => undefined);
  return res;
};

describe('fans routes', () => {
  beforeEach(() => {
    mockCallService.mockReset();
  });

  it('toggles a fan entity', async () => {
    const res = await runHandler('/:entityId/toggle');
    expect(mockCallService).toHaveBeenCalledWith('fan', 'toggle', { entity_id: 'fan.office' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('sets fan percentage when payload is valid', async () => {
    const res = await runHandler('/:entityId/percentage', {
      body: { percentage: 75 },
    });
    expect(mockCallService).toHaveBeenCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.office',
      percentage: 75,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects invalid percentage payloads', async () => {
    const res = await runHandler('/:entityId/percentage', {
      body: { percentage: 150 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: 'percentage debe ser un número entre 0 y 100' });
    expect(mockCallService).not.toHaveBeenCalled();
  });
});

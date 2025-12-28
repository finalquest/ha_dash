import type { Request, Response } from 'express';
import climateRouter from '../climate';

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
  path: '/:entityId/mode' | '/:entityId/temperature',
  options: { entityId?: string; body?: Record<string, unknown> } = {},
) => {
  const layer = climateRouter.stack.find((stack) => stack.route?.path === path);
  if (!layer) {
    throw new Error(`Handler for ${path} not found`);
  }
  const handler = layer.route!.stack[0].handle;
  const req = {
    params: { entityId: options.entityId ?? 'climate.living_room' },
    body: options.body ?? {},
  } as unknown as Request;
  const res = createMockResponse();
  await handler(req, res, () => undefined);
  return res;
};

describe('climate routes', () => {
  beforeEach(() => {
    mockCallService.mockReset();
  });

  it('sets hvac mode when payload is valid', async () => {
    const res = await runHandler('/:entityId/mode', { body: { mode: 'cool' } });
    expect(mockCallService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.living_room',
      hvac_mode: 'cool',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects invalid hvac mode payloads', async () => {
    const res = await runHandler('/:entityId/mode', { body: {} });
    expect(res.statusCode).toBe(400);
    expect(mockCallService).not.toHaveBeenCalled();
  });

  it('sets target temperature when payload is valid', async () => {
    const res = await runHandler('/:entityId/temperature', { body: { temperature: 23.5 } });
    expect(mockCallService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.living_room',
      temperature: 23.5,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects invalid temperature payloads', async () => {
    const res = await runHandler('/:entityId/temperature', { body: { temperature: 'foo' } });
    expect(res.statusCode).toBe(400);
    expect(mockCallService).not.toHaveBeenCalled();
  });
});

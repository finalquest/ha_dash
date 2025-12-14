import type { Request, Response } from 'express';
import lightsRouter from '../lights';

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
  path: '/:entityId/toggle' | '/:entityId/on' | '/:entityId/off',
  entityId = 'light.living_room',
) => {
  const layer = lightsRouter.stack.find((layer) => layer.route?.path === path);
  if (!layer) {
    throw new Error(`Handler for ${path} not found`);
  }
  const handler = layer.route!.stack[0].handle;
  const req = { params: { entityId } } as unknown as Request;
  const res = createMockResponse();
  await handler(req, res, () => undefined);
  return res;
};

describe('lights routes', () => {
  beforeEach(() => {
    mockCallService.mockReset();
  });

  it('toggles a light entity', async () => {
    const res = await runHandler('/:entityId/toggle');
    expect(mockCallService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.living_room' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('supports switch entities', async () => {
    const res = await runHandler('/:entityId/toggle', 'switch.patio');
    expect(mockCallService).toHaveBeenCalledWith('switch', 'toggle', { entity_id: 'switch.patio' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects non light entities', async () => {
    const layer = lightsRouter.stack.find((stack) => stack.route?.path === '/:entityId/on');
    if (!layer) throw new Error('missing');
    const handler = layer.route!.stack[0].handle;
    const req = { params: { entityId: 'sensor.temp' } } as unknown as Request;
    const res = createMockResponse();
    await handler(req, res, () => undefined);
    expect(res.statusCode).toBe(400);
  });
});

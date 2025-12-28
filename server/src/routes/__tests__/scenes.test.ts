import type { Request, Response } from 'express';
import scenesRouter from '../scenes';

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

const runHandler = async (entityId = 'scene.living_room_evening') => {
  const layer = scenesRouter.stack.find((stack) => stack.route?.path === '/:entityId/activate');
  if (!layer) {
    throw new Error('Handler not found');
  }
  const handler = layer.route!.stack[0].handle;
  const req = { params: { entityId } } as unknown as Request;
  const res = createMockResponse();
  await handler(req, res, () => undefined);
  return res;
};

describe('scenes routes', () => {
  beforeEach(() => {
    mockCallService.mockReset();
  });

  it('activates a scene entity', async () => {
    const res = await runHandler();
    expect(mockCallService).toHaveBeenCalledWith('scene', 'turn_on', { entity_id: 'scene.living_room_evening' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns error when activation fails', async () => {
    mockCallService.mockRejectedValueOnce(new Error('boom'));
    const layer = scenesRouter.stack.find((stack) => stack.route?.path === '/:entityId/activate');
    if (!layer) throw new Error('handler missing');
    const handler = layer.route!.stack[0].handle;
    const req = { params: { entityId: 'scene.office' } } as unknown as Request;
    const res = createMockResponse();
    await handler(req, res, () => undefined);
    expect(res.statusCode).toBe(400);
  });
});

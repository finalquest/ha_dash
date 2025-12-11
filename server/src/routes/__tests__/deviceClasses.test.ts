import type { Request, Response } from 'express';
import { deviceClassesHandler } from '../deviceClasses';

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test:8123',
    haToken: 'token',
    port: 4000,
  }),
}));

jest.mock('../../ha/client', () => {
  const mockGetStates = jest.fn();
  return {
    createHomeAssistantClient: jest.fn().mockReturnValue({
      getStates: mockGetStates,
    }),
    mockGetStates,
  };
});

const { mockGetStates } = jest.requireMock('../../ha/client') as {
  mockGetStates: jest.Mock;
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

const runHandler = async () => {
  const req = {} as Request;
  const res = createMockResponse();
  await deviceClassesHandler(req, res as Response);
  return res;
};

const buildState = (attributes: Record<string, unknown>) => ({
  entity_id: 'sensor.test',
  state: 'on',
  attributes,
  last_changed: '2025-12-09T00:00:00+00:00',
  last_updated: '2025-12-09T00:00:00+00:00',
  context: { id: '1', parent_id: null, user_id: null },
});

describe('deviceClassesHandler', () => {
  beforeEach(() => {
    mockGetStates.mockReset();
  });

  it('returns unique sorted device classes', async () => {
    mockGetStates.mockResolvedValue([
      buildState({ device_class: 'energy' }),
      buildState({ device_class: 'temperature' }),
      buildState({ device_class: 'energy' }),
      buildState({}),
    ]);

    const res = await runHandler();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, deviceClasses: ['energy', 'temperature'] });
  });

  it('handles errors gracefully', async () => {
    mockGetStates.mockRejectedValue(new Error('HA error'));

    const res = await runHandler();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, deviceClasses: [], error: 'HA error' });
  });
});

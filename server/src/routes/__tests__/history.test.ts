import type { Request, Response } from 'express';
import { entityHistoryHandler } from '../history';

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test',
    haToken: 'token',
    port: 4000,
  }),
}));

jest.mock('../../ha/client', () => {
  const mockGetStates = jest.fn();
  const mockGetHistory = jest.fn();
  return {
    createHomeAssistantClient: jest.fn().mockReturnValue({
      getStates: mockGetStates,
      getHistory: mockGetHistory,
    }),
    mockGetStates,
    mockGetHistory,
  };
});

const { mockGetHistory } = jest.requireMock('../../ha/client') as {
  mockGetHistory: jest.Mock;
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

describe('entity history route', () => {
  beforeEach(() => {
    mockGetHistory.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2025-12-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns sampled history points', async () => {
    mockGetHistory.mockResolvedValue([
      {
        entity_id: 'sensor.device_power',
        state: '20',
        attributes: { unit_of_measurement: 'W' },
        last_changed: '2025-12-10T11:00:00Z',
        last_updated: '2025-12-10T11:00:00Z',
        context: { id: '1', parent_id: null, user_id: null },
      },
      {
        entity_id: 'sensor.device_power',
        state: '30',
        attributes: { unit_of_measurement: 'W' },
        last_changed: '2025-12-10T11:10:00Z',
        last_updated: '2025-12-10T11:10:00Z',
        context: { id: '2', parent_id: null, user_id: null },
      },
    ]);

    const req = {
      params: { entityId: 'sensor.device_power' },
      query: { hours: '1', intervalMinutes: '15' },
    } as unknown as Request;
    const res = createMockResponse();

    await entityHistoryHandler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { points: Array<{ value: number | null; unit?: string }> };
    expect(body.points).toHaveLength(1);
    expect(body.points[0]).toMatchObject({ value: 20, unit: 'W' });
  });
});

import type { Request, Response } from 'express';
import { areasHandler } from '../areas';

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test',
    haToken: 'token',
    port: 4000,
  }),
}));

jest.mock('../../ha/client', () => {
  const mockGetAreas = jest.fn();
  return {
    createHomeAssistantClient: jest.fn().mockReturnValue({
      getAreas: mockGetAreas,
    }),
    mockGetAreas,
  };
});

const { mockGetAreas } = jest.requireMock('../../ha/client') as {
  mockGetAreas: jest.Mock;
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
  await areasHandler(req, res as Response);
  return res;
};

describe('areasHandler', () => {
  beforeEach(() => {
    mockGetAreas.mockReset();
  });

  it('returns areas from Home Assistant', async () => {
    const mockAreas = [
      { area_id: 'kitchen', name: 'Kitchen' },
      { area_id: 'living_room', name: 'Living Room' },
    ];
    mockGetAreas.mockResolvedValue(mockAreas);

    const res = await runHandler();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, areas: mockAreas });
  });

  it('handles errors gracefully', async () => {
    mockGetAreas.mockRejectedValue(new Error('HA error'));

    const res = await runHandler();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, areas: [], error: 'HA error' });
  });
});

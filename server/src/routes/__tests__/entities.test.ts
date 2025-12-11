import type { Request, Response } from 'express';
import { entitiesHandler } from '../entities';
import { createHomeAssistantClient } from '../../ha/client';
import { getConfig } from '../../config';

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test:8123',
    haToken: 'test-token',
    port: 4000,
  }),
}));

jest.mock('../../ha/client', () => {
  const mockGetStates = jest.fn();
  const mockGetAreas = jest.fn();
  const mockGetEntityMetadata = jest.fn();
  return {
    createHomeAssistantClient: jest.fn().mockReturnValue({
      getStates: mockGetStates,
      getAreas: mockGetAreas,
      getEntityMetadata: mockGetEntityMetadata,
    }),
    mockGetStates,
    mockGetAreas,
    mockGetEntityMetadata,
  };
});

const { mockGetStates, mockGetAreas, mockGetEntityMetadata } = jest.requireMock(
  '../../ha/client',
) as {
  mockGetStates: jest.Mock;
  mockGetAreas: jest.Mock;
  mockGetEntityMetadata: jest.Mock;
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
  await entitiesHandler(req, res);
  return res;
};

describe('entitiesHandler', () => {
  beforeEach(() => {
    mockGetStates.mockReset();
    mockGetAreas.mockReset();
    mockGetEntityMetadata.mockReset();
    mockGetAreas.mockResolvedValue([]);
    mockGetEntityMetadata.mockResolvedValue({});
  });

  it('returns entities from Home Assistant', async () => {
    const mockEntities = [
      {
        entity_id: 'sensor.test',
        state: 'on',
        attributes: { friendly_name: 'Test Sensor' },
        last_changed: '2025-12-09T00:00:00+00:00',
        last_updated: '2025-12-09T00:00:00+00:00',
        context: { id: '1', parent_id: null, user_id: null },
      },
    ];
    mockGetStates.mockResolvedValue(mockEntities);
    mockGetAreas.mockResolvedValue([{ area_id: 'tv', name: 'TV' }]);
    mockGetEntityMetadata.mockResolvedValue({
      'sensor.test': { area_id: 'tv', device_id: 'device123' },
    });

    const res = await runHandler();

    expect(mockGetStates).toHaveBeenCalled();
    expect(mockGetAreas).toHaveBeenCalled();
    expect(mockGetEntityMetadata).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      entities: [
        {
          ...mockEntities[0],
          attributes: {
            ...mockEntities[0].attributes,
            area_id: 'tv',
            area_name: 'TV',
            device_id: 'device123',
          },
        },
      ],
    });
  });

  it('handles errors from Home Assistant', async () => {
    mockGetStates.mockRejectedValue(new Error('HA error'));

    const res = await runHandler();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'HA error' });
  });
});

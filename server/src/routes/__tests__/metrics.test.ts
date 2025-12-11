import type { Request, Response } from 'express';
import { listMetricGroupsHandler, metricGroupStateHandler } from '../metrics';
import { getDb } from '../../db/connection';

const sampleStates = [
  {
    entity_id: 'sensor.device_power',
    state: '25.6',
    attributes: {
      device_class: 'power',
      friendly_name: 'Device Power',
      unit_of_measurement: 'W',
      device_id: 'device123',
    },
    last_changed: '2025-12-10T10:00:00+00:00',
    last_updated: '2025-12-10T10:00:00+00:00',
    context: { id: '1', parent_id: null, user_id: null },
  },
  {
    entity_id: 'sensor.device_voltage',
    state: '231.1',
    attributes: {
      device_class: 'voltage',
      friendly_name: 'Device Voltage',
      unit_of_measurement: 'V',
      device_id: 'device123',
    },
    last_changed: '2025-12-10T10:00:00+00:00',
    last_updated: '2025-12-10T10:00:00+00:00',
    context: { id: '2', parent_id: null, user_id: null },
  },
  {
    entity_id: 'sensor.device_current',
    state: '0.14',
    attributes: {
      device_class: 'current',
      friendly_name: 'Device Current',
      unit_of_measurement: 'A',
      device_id: 'device123',
    },
    last_changed: '2025-12-10T10:00:00+00:00',
    last_updated: '2025-12-10T10:00:00+00:00',
    context: { id: '3', parent_id: null, user_id: null },
  },
] as const;

jest.mock('../../config', () => ({
  getConfig: jest.fn().mockReturnValue({
    haBaseUrl: 'http://ha.test',
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

const runListHandler = async () => {
  const req = {} as Request;
  const res = createMockResponse();
  await listMetricGroupsHandler(req, res);
  return res;
};

const runStateHandler = async (id: string) => {
  const req = { params: { id } } as unknown as Request;
  const res = createMockResponse();
  await metricGroupStateHandler(req, res);
  return res;
};

describe('metrics routes', () => {
  beforeEach(() => {
    mockGetStates.mockReset();
    const db = getDb();
    db.exec('DELETE FROM metric_group_entities; DELETE FROM metric_groups;');
  });

  it('returns inferred metric groups', async () => {
    mockGetStates.mockResolvedValue(sampleStates);
    const res = await runListHandler();
    expect(res.statusCode).toBe(200);
    const body = res.body as { groups: Array<{ metrics: Record<string, { entityId: string }> }> };
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].metrics.power.entityId).toBe('sensor.device_power');
  });

  it('returns state for a specific metric group', async () => {
    mockGetStates.mockResolvedValue(sampleStates);
    const listRes = await runListHandler();
    const groupId = (listRes.body as { groups: Array<{ id: string }> }).groups[0].id;

    const stateRes = await runStateHandler(groupId);
    expect(stateRes.statusCode).toBe(200);
    const body = stateRes.body as { metrics: Record<string, { value: string; unit: string }> };
    expect(body.metrics.power.value).toBe('25.6');
    expect(body.metrics.voltage.unit).toBe('V');
  });
});

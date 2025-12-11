import type { Request, Response } from 'express';
import { healthHandler } from '../health';

const ORIGINAL_ENV = process.env;
const originalFetch = global.fetch;

const setFetchMock = (implementation: jest.Mock) => {
  (global as unknown as { fetch: typeof fetch }).fetch = implementation as unknown as typeof fetch;
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

const runHealthHandler = async () => {
  const req = {} as Request;
  const res = createMockResponse();
  await healthHandler(req, res);
  return { status: res.statusCode, body: res.body };
};

describe('healthHandler', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      HA_BASE_URL: 'http://ha.test:8123',
      HA_TOKEN: 'test-token',
      PORT: '4000',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error allow clearing fetch when undefined
      delete global.fetch;
    }
    jest.resetAllMocks();
  });

  it('returns ok when Home Assistant responds successfully', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'API running.' }),
    });
    setFetchMock(fetchMock);

    const result = await runHealthHandler();

    expect(fetchMock).toHaveBeenCalledWith('http://ha.test:8123/api/', expect.any(Object));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, ha: { message: 'API running.' } });
  });

  it('returns 401 when token is invalid', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });
    setFetchMock(fetchMock);

    const result = await runHealthHandler();

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ ok: false });
  });

  it('returns 502 when Home Assistant is unavailable', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Service Unavailable' }),
    });
    setFetchMock(fetchMock);

    const result = await runHealthHandler();

    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ ok: false });
  });

  it('returns 500 when configuration is missing', async () => {
    delete process.env.HA_TOKEN;
    const result = await runHealthHandler();

    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ ok: false });
  });
});

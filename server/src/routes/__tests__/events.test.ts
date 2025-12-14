import type { Request, Response } from 'express';
import eventsRouter from '../events';
import EventEmitter from 'events';

const mockHub = new EventEmitter() as EventEmitter & {
  isConnected: jest.Mock;
};
mockHub.isConnected = jest.fn().mockReturnValue(true);

jest.mock('../../ha/events', () => ({
  getEventHub: jest.fn(() => mockHub),
}));

const createMockResponse = () => {
  const res = {
    setHeader: jest.fn(),
    write: jest.fn(),
    flushHeaders: jest.fn(),
  } as unknown as Response & {
    setHeader: jest.Mock;
    write: jest.Mock;
    flushHeaders: jest.Mock;
  };
  return res;
};

const runStreamHandler = () => {
  const layer = eventsRouter.stack.find((layer) => layer.route?.path === '/stream');
  if (!layer) throw new Error('Handler not found');
  const handler = layer.route!.stack[0].handle;
  let closeHandler: (() => void) | undefined;
  const req = ({
    on: jest.fn((event: string, handler: () => void) => {
      if (event === 'close') {
        closeHandler = handler;
      }
    }),
  } as unknown) as Request;
  const res = createMockResponse();
  handler(req, res, () => undefined);
  return { res, close: () => closeHandler?.() };
};

describe('events stream', () => {
  it('initializes SSE headers and emits status', () => {
    const { res, close } = runStreamHandler();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"type":"status"'));
    close();
  });

  it('writes events when hub emits state change', () => {
    const { res, close } = runStreamHandler();
    mockHub.emit('state_changed', { entity_id: 'light.test', new_state: {}, old_state: {} });
    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('"entity_id":"light.test"'),
    );
    close();
  });
});

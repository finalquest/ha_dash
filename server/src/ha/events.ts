import EventEmitter from 'events';
import WebSocket from 'ws';
import { getConfig } from '../config';

type StateChangedEvent = {
  entity_id: string;
  new_state: unknown;
  old_state: unknown;
};

type SceneTriggeredEvent = {
  entityIds: string[];
  timestamp: string;
};

class HomeAssistantEventHub extends EventEmitter {
  private ws?: WebSocket;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private requestId = 1;
  private subscriptionIds = new Set<number>();
  private sceneTriggerMap = new Map<string, string>();

  constructor(private baseUrl: string, private token: string) {
    super();
    this.connect();
  }

  isConnected() {
    return this.connected;
  }

  private connect() {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/api/websocket';
    this.ws = new WebSocket(wsUrl);

    this.ws.on('message', (raw) => this.handleMessage(raw.toString()));
    this.ws.on('close', () => this.handleDisconnect());
    this.ws.on('error', () => this.handleDisconnect());
  }

  private handleDisconnect() {
    if (this.connected) {
      this.connected = false;
      this.emit('status', { online: false });
    }
    this.subscriptionIds.clear();
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 3000);
  }

  private handleMessage(raw: string) {
    let payload: { type?: string; id?: number; success?: boolean; event?: { event_type?: string; data?: Record<string, unknown> }; message?: string };
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      return;
    }

    if (payload.type === 'auth_required') {
      this.ws?.send(
        JSON.stringify({
          type: 'auth',
          access_token: this.token,
        }),
      );
      return;
    }

    if (payload.type === 'auth_invalid') {
      this.handleDisconnect();
      return;
    }

    if (payload.type === 'auth_ok') {
      this.connected = true;
      this.emit('status', { online: true });
      this.subscribeToEvent('state_changed');
      this.subscribeToEvent('call_service');
      return;
    }

    if (payload.type === 'result' && payload.success === false && payload.id && this.subscriptionIds.has(payload.id)) {
      this.handleDisconnect();
      return;
    }

    if (payload.type === 'event') {
      if (payload.event?.event_type === 'state_changed') {
        const eventData = payload.event.data as { entity_id: string; new_state: unknown; old_state: unknown } | undefined;
        if (eventData?.entity_id) {
          const event: StateChangedEvent = {
            entity_id: eventData.entity_id,
            new_state: eventData.new_state,
            old_state: eventData.old_state,
          };
          this.emit('state_changed', event);
        }
      } else if (payload.event?.event_type === 'call_service') {
        const eventData = payload.event.data as {
          domain?: string;
          service?: string;
          service_data?: { entity_id?: string | string[] };
        };
        if (eventData?.domain === 'scene' && eventData.service === 'turn_on') {
          const entityIdData = eventData.service_data?.entity_id;
          const sceneIds =
            typeof entityIdData === 'string'
              ? [entityIdData]
              : Array.isArray(entityIdData)
                ? entityIdData.filter((value): value is string => typeof value === 'string')
                : [];
          if (sceneIds.length > 0) {
            const event: SceneTriggeredEvent = {
              entityIds: sceneIds,
              timestamp: new Date().toISOString(),
            };
            sceneIds.forEach((sceneId) => {
              this.sceneTriggerMap.set(sceneId, event.timestamp);
            });
            this.emit('scene_triggered', event);
          }
        }
      }
    }
  }

  private subscribeToEvent(eventType: string) {
    if (!this.ws) return;
    const id = this.requestId++;
    this.subscriptionIds.add(id);
    this.ws.send(
      JSON.stringify({
        id,
        type: 'subscribe_events',
        event_type: eventType,
      }),
    );
  }

  getSceneTriggerMap() {
    return new Map(this.sceneTriggerMap);
  }
}

let hub: HomeAssistantEventHub | null = null;

export const getEventHub = () => {
  if (hub) return hub;
  const config = getConfig();
  hub = new HomeAssistantEventHub(config.haBaseUrl, config.haToken);
  return hub;
};

export type HomeAssistantEventHubType = ReturnType<typeof getEventHub>;

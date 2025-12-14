import WebSocket from 'ws';
import { AppConfig } from '../config';
import type {
  HomeAssistantArea,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityMetadata,
  HomeAssistantEntityState,
  HomeAssistantHistoryEntry,
} from './types';

export interface HomeAssistantInfo {
  message?: string;
  version?: string;
  [key: string]: unknown;
}

export class HomeAssistantError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'HomeAssistantError';
  }
}

export class HomeAssistantClient {
  private baseUrl: string;
  private token: string;
  private websocketRequestId = 1;

  constructor(opts: { baseUrl: string; token: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.token = opts.token;
  }

  private buildUrl(path: string) {
    return `${this.baseUrl}${path}`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      headers: {
        ...this.headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
      ...init,
    });

    if (!response.ok) {
      const errorBody = await this.safeParseJson(response);
      throw new HomeAssistantError(
        (errorBody as { message?: string } | null)?.message ||
          `Home Assistant request failed with status ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  private async safeParseJson(response: globalThis.Response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async health(): Promise<HomeAssistantInfo> {
    return this.fetchJson<HomeAssistantInfo>('/api/');
  }

  async getStates(): Promise<HomeAssistantEntityState[]> {
    return this.fetchJson<HomeAssistantEntityState[]>('/api/states');
  }

  async getAreas(): Promise<HomeAssistantArea[]> {
    try {
      return await this.fetchJson<HomeAssistantArea[]>('/api/config/area_registry/areas');
    } catch (error) {
      if (error instanceof HomeAssistantError && error.status === 404) {
        try {
          return await this.fetchJson<HomeAssistantArea[]>('/api/config/areas');
        } catch (fallbackError) {
          if (
            fallbackError instanceof HomeAssistantError &&
            fallbackError.status === 404
          ) {
            return this.fetchAreasViaTemplate();
          }
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  private async executeTemplate<T>(template: string): Promise<T> {
    const response = await fetch(this.buildUrl('/api/template'), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ template }),
    });

    if (!response.ok) {
      const errorBody = await this.safeParseJson(response);
      throw new HomeAssistantError(
        (errorBody as { message?: string } | null)?.message ||
          `Home Assistant template request failed with status ${response.status}`,
        response.status,
      );
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new HomeAssistantError('Invalid template response');
    }
  }

  private async fetchAreasViaTemplate(): Promise<HomeAssistantArea[]> {
    const template = '{{ areas() | tojson }}';
    return this.executeTemplate<HomeAssistantArea[]>(template);
  }

  async getHistory(entityId: string, start: Date, end: Date): Promise<HomeAssistantHistoryEntry[]> {
    const startISO = start.toISOString();
    const params = new URLSearchParams({
      filter_entity_id: entityId,
      minimal_response: '1',
      significant_changes_only: '0',
      end: end.toISOString(),
    });
    const path = `/api/history/period/${encodeURIComponent(startISO)}?${params.toString()}`;
    const response = await this.fetchJson<HomeAssistantHistoryEntry[][]>(path);
    return response[0] ?? [];
  }

  async getEntityMetadata(): Promise<Record<string, { area_id?: string; device_id?: string }>> {
    const entityEntries = await this.fetchEntityRegistryEntries();
    if (entityEntries?.length) {
      // eslint-disable-next-line no-console
      console.info('[ha-client] entity registry entries', entityEntries.length);
      const deviceEntries = await this.fetchDeviceRegistryEntries();
      const deviceAreaMap = new Map<string, string | undefined>(
        deviceEntries.map((device) => [device.id, device.area_id ?? undefined]),
      );
      // eslint-disable-next-line no-console
      console.info('[ha-client] device registry entries', deviceEntries.length);

      return this.buildMetadataMap(entityEntries, deviceAreaMap);
    }

    // eslint-disable-next-line no-console
    console.warn('[ha-client] falling back to template metadata lookup');
    const templateEntries = await this.fetchEntityMetadataViaTemplate();
    // eslint-disable-next-line no-console
    console.info('[ha-client] template metadata entries', templateEntries.length);
    return this.buildMetadataMap(templateEntries);
  }

  private async fetchEntityRegistryEntries() {
    try {
      return await this.callWebSocket<HomeAssistantEntityMetadata[]>({
        type: 'config/entity_registry/list',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[ha-client] unable to fetch entity registry via websocket', error);
      return undefined;
    }
  }

  private async fetchDeviceRegistryEntries() {
    try {
      return await this.callWebSocket<HomeAssistantDeviceRegistryEntry[]>({
        type: 'config/device_registry/list',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[ha-client] unable to fetch device registry via websocket', error);
      return [];
    }
  }

  private async fetchEntityMetadataViaTemplate() {
    const template = `
{% set result = [] %}
{% for s in states %}
  {% set entity_area = area_id(s.entity_id) %}
  {% set entity_device = device_id(s.entity_id) %}
  {% if entity_area or entity_device %}
    {% set _ = result.append({'entity_id': s.entity_id, 'area_id': entity_area, 'device_id': entity_device}) %}
  {% endif %}
{% endfor %}
{{ result | tojson }}
`;

    return this.executeTemplate<HomeAssistantEntityMetadata[]>(template).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('[ha-client] template metadata lookup failed', error);
      return [];
    });
  }

  private buildMetadataMap(
    entries: HomeAssistantEntityMetadata[],
    deviceAreaMap?: Map<string, string | undefined>,
  ) {
    return entries.reduce<Record<string, { area_id?: string; device_id?: string }>>((acc, entry) => {
      const deviceArea = entry.device_id ? deviceAreaMap?.get(entry.device_id) : undefined;
      acc[entry.entity_id] = {
        area_id: entry.area_id ?? deviceArea ?? undefined,
        device_id: entry.device_id ?? undefined,
      };
      return acc;
    }, {});
  }

  private async callWebSocket<T>(message: Record<string, unknown>): Promise<T> {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/api/websocket';
    const requestId = this.websocketRequestId++;

    return new Promise<T>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const cleanup = (opts?: { error?: Error; result?: T }) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        try {
          ws.close();
        } catch (closeError) {
          // ignore close errors
        }
        if (opts?.error) {
          reject(opts.error);
        } else {
          resolve(opts?.result as T);
        }
      };

      timeout = setTimeout(() => {
        cleanup({ error: new HomeAssistantError('Home Assistant websocket request timed out') });
      }, 8000);

      ws.on('error', (error) => {
        cleanup({ error: error instanceof Error ? error : new Error('WebSocket error') });
      });

      ws.on('close', () => {
        cleanup({ error: new HomeAssistantError('Home Assistant websocket closed unexpectedly') });
      });

      ws.on('message', (raw) => {
        let payload: { type?: string; id?: number; success?: boolean; result?: unknown; error?: { message?: string } };
        try {
          payload = JSON.parse(raw.toString());
        } catch (error) {
          cleanup({ error: new HomeAssistantError('Invalid websocket payload') });
          return;
        }

        if (payload.type === 'auth_required') {
          ws.send(
            JSON.stringify({
              type: 'auth',
              access_token: this.token,
            }),
          );
          return;
        }

        if (payload.type === 'auth_invalid') {
          cleanup({ error: new HomeAssistantError('Home Assistant websocket authentication failed') });
          return;
        }

        if (payload.type === 'auth_ok') {
          ws.send(
            JSON.stringify({
              id: requestId,
              ...message,
            }),
          );
          return;
        }

        if (payload.type === 'result' && payload.id === requestId) {
          if (payload.success) {
            cleanup({ result: payload.result as T });
          } else {
            cleanup({
              error: new HomeAssistantError(
                payload.error?.message || 'Home Assistant websocket request failed',
              ),
            });
          }
        }
      });
    });
  }

  async callService(domain: string, service: string, payload: Record<string, unknown> = {}) {
    const path = `/api/services/${domain}/${service}`;
    const response = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await this.safeParseJson(response);
      throw new HomeAssistantError(
        (errorBody as { message?: string } | null)?.message ||
          `Home Assistant service call failed with status ${response.status}`,
        response.status,
      );
    }

    return response.json().catch(() => undefined);
  }
}

export const createHomeAssistantClient = (config: AppConfig) =>
  new HomeAssistantClient({ baseUrl: config.haBaseUrl, token: config.haToken });

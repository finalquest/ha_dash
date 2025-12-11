import { AppConfig } from '../config';
import type {
  HomeAssistantArea,
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

  private async fetchAreasViaTemplate(): Promise<HomeAssistantArea[]> {
    const template = '{{ areas() | tojson }}';
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
      return JSON.parse(text) as HomeAssistantArea[];
    } catch (error) {
      throw new HomeAssistantError('Invalid template response for areas');
    }
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
}

export const createHomeAssistantClient = (config: AppConfig) =>
  new HomeAssistantClient({ baseUrl: config.haBaseUrl, token: config.haToken });

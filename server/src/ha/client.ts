import { AppConfig } from '../config';

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

  async fetchJson<T = unknown>(path: string): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      headers: this.headers,
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
}

export const createHomeAssistantClient = (config: AppConfig) =>
  new HomeAssistantClient({ baseUrl: config.haBaseUrl, token: config.haToken });

import type {
  AreasResponse,
  EntitiesResponse,
  EntityHistoryResponse,
  MetricGroupStateResponse,
  MetricGroupsResponse,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const buildUrl = (path: string) => `${BASE_URL}${path}`;

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? response.statusText;
    throw new Error(message || 'Request failed');
  }
  return (await response.json()) as T;
}

export const fetchEntities = async () => {
  const response = await fetch(buildUrl('/api/entities'));
  const data = await handleResponse<EntitiesResponse>(response);
  return data.entities;
};

export const fetchAreas = async () => {
  const response = await fetch(buildUrl('/api/areas'));
  const data = await handleResponse<AreasResponse>(response);
  return data.areas;
};

export const fetchMetricGroups = async () => {
  const response = await fetch(buildUrl('/api/devices/metrics'));
  const data = await handleResponse<MetricGroupsResponse>(response);
  return data.groups;
};

export const fetchMetricGroupState = async (groupId: string) => {
  const response = await fetch(buildUrl(`/api/devices/metrics/${groupId}/state`));
  return handleResponse<MetricGroupStateResponse>(response);
};

export const fetchEntityHistory = async (
  entityId: string,
  params?: { hours?: number; intervalMinutes?: number },
) => {
  const searchParams = new URLSearchParams();
  if (params?.hours) {
    searchParams.set('hours', String(params.hours));
  }
  if (params?.intervalMinutes) {
    searchParams.set('intervalMinutes', String(params.intervalMinutes));
  }
  const query = searchParams.toString();
  const response = await fetch(
    buildUrl(`/api/entities/${encodeURIComponent(entityId)}/history${query ? `?${query}` : ''}`),
  );
  return handleResponse<EntityHistoryResponse>(response);
};

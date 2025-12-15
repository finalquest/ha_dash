import type {
  AreasResponse,
  EntitiesResponse,
  EntityHistoryResponse,
  CreateFavoritePayload,
  FavoritesResponse,
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

export const fetchFavorites = async (dashboardId?: string) => {
  const search = dashboardId ? `?dashboardId=${encodeURIComponent(dashboardId)}` : '';
  const response = await fetch(buildUrl(`/api/favorites${search}`));
  const data = await handleResponse<FavoritesResponse>(response);
  return data.favorites;
};

export const createFavorite = async (payload: CreateFavoritePayload) => {
  const response = await fetch(buildUrl('/api/favorites'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ ok: boolean }>(response);
};

export const deleteFavorite = async (favoriteId: string) => {
  const response = await fetch(buildUrl(`/api/favorites/${favoriteId}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? response.statusText;
    throw new Error(message || 'Request failed');
  }
};

const lightAction = async (entityId: string, action: 'toggle' | 'on' | 'off') => {
  const response = await fetch(buildUrl(`/api/lights/${encodeURIComponent(entityId)}/${action}`), {
    method: 'POST',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? response.statusText;
    throw new Error(message || 'Request failed');
  }
};

export const toggleLight = (entityId: string) => lightAction(entityId, 'toggle');
export const turnOnLight = (entityId: string) => lightAction(entityId, 'on');
export const turnOffLight = (entityId: string) => lightAction(entityId, 'off');

export const reorderFavorites = async (order: string[]) => {
  const response = await fetch(buildUrl('/api/favorites/reorder'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? response.statusText;
    throw new Error(message || 'Request failed');
  }
  return response.json().catch(() => ({ ok: true }));
};

import type { AreasResponse, EntitiesResponse } from './types';

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

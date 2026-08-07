import type {
  ApiRequestControl,
  CharactersRequest,
  LocationsRequest,
  ResourceByIdRequest,
  ResourcesByIdsRequest,
} from 'models/api-requests';
import type { ApiPage, Character, Episode, Location } from 'models/rick-and-morty';
import {
  createRickAndMortyHttpError,
  getRickAndMortyErrorView,
  normalizeRickAndMortyError,
  throwPreviewError,
} from 'services/rickAndMortyApiError';
import { travelStore } from 'stores/travelStore';

const API_URL = 'https://rickandmortyapi.com/api';
const DEFAULT_TIMEOUT_MS = 8_000;

// Un contador evita que varias peticiones paralelas desactiven `loading`
// antes de que todas hayan terminado.
let pendingRequests = 0;

function startLoading(): void {
  pendingRequests += 1;
  travelStore.getState().setLoading(true);
}

function stopLoading(): void {
  pendingRequests = Math.max(0, pendingRequests - 1);
  travelStore.getState().setLoading(pendingRequests > 0);
}

// Cliente genérico evaluado: fetch, async/await, timeout y try/catch/finally.
async function request<T>(pathOrUrl: string, control: ApiRequestControl = {}): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const { trackLoading = true, reportError = true } = control;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  if (trackLoading) startLoading();
  if (reportError) travelStore.getState().setError(null);

  try {
    throwPreviewError();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw createRickAndMortyHttpError(response);
    return (await response.json()) as T;
  } catch (error: unknown) {
    const apiError = normalizeRickAndMortyError(error, controller.signal.aborted);
    if (reportError) travelStore.getState().setError(getRickAndMortyErrorView(apiError));
    throw apiError;
  } finally {
    globalThis.clearTimeout(timeout);
    if (trackLoading) stopLoading();
  }
}

// Consultas de dominio con parámetros y respuestas tipadas.
export function getLocations(filters: LocationsRequest = {}): Promise<ApiPage<Location>> {
  const { page = 1, name, type, dimension } = filters;
  const params = new URLSearchParams({ page: String(page) });
  if (name?.trim()) params.set('name', name.trim());
  if (type?.trim() && type !== 'all') params.set('type', type.trim());
  if (dimension?.trim()) params.set('dimension', dimension.trim());
  return request<ApiPage<Location>>(`/location?${params.toString()}`);
}

export function getCharacters(filters: CharactersRequest = {}): Promise<ApiPage<Character>> {
  const { page = 1, name, status, species, type, gender } = filters;
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  if (name?.trim()) params.set('name', name.trim());
  if (species?.trim()) params.set('species', species.trim());
  if (type?.trim()) params.set('type', type.trim());
  if (gender) params.set('gender', gender);
  return request<ApiPage<Character>>(`/character?${params.toString()}`);
}

export function getLocation({ id }: ResourceByIdRequest): Promise<Location> {
  return request<Location>(`/location/${id}`);
}

// La API admite varios IDs separados por comas en una sola petición.
export async function getCharactersByIds(
  { ids }: ResourcesByIdsRequest,
  control: ApiRequestControl = {},
): Promise<Character[]> {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  if (uniqueIds.length === 0) return [];

  const result = await request<Character | Character[]>(
    `/character/${uniqueIds.join(',')}`,
    control,
  );
  return Array.isArray(result) ? result : [result];
}

export async function getEpisodesByIds(
  { ids }: ResourcesByIdsRequest,
  control: ApiRequestControl = {},
): Promise<Episode[]> {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  if (uniqueIds.length === 0) return [];

  const result = await request<Episode | Episode[]>(`/episode/${uniqueIds.join(',')}`, control);
  return Array.isArray(result) ? result : [result];
}

export function getIdFromUrl(url: string): number {
  return Number(url.split('/').pop());
}

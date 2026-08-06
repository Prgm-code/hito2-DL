import type { ApiPage, Character, Episode, Location } from "../types/rick-and-morty";
import type {
  ApiRequestControl,
  CharactersRequest,
  EpisodesRequest,
  LocationsRequest,
  ResourceByIdRequest,
  ResourcesByIdsRequest,
} from "../types/api-requests";
import { travelStore } from "../stores/travelStore";
import {
  getRickAndMortyErrorView,
  normalizeRickAndMortyError,
  RickAndMortyApiError,
} from "./rickAndMortyApiError";

const API_URL = "https://rickandmortyapi.com/api";
const DEFAULT_TIMEOUT_MS = 3_000; // 3 segundos para testear los errores de la ui
const ERROR_PREVIEW_PARAM = "apiError";

// Un contador evita que varias peticiones paralelas desactiven `loading`
// antes de que todas hayan terminado.
// esto a causa del promise.all() en initializeApp() y la carga de imágenes de vista previa.
let pendingRequests = 0;

function startLoading(): void {
  pendingRequests += 1;
  travelStore.getState().setLoading(true);
}

function stopLoading(): void {
  pendingRequests = Math.max(0, pendingRequests - 1);
  travelStore.getState().setLoading(pendingRequests > 0);
}

/**
 * Permite revisar la UI de errores sin romper la URL real de la API.
 * Ejemplo: `/?apiError=404` o `/?apiError=500`.
 */
function getPreviewErrorStatus(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const status = Number(new URLSearchParams(window.location.search).get(ERROR_PREVIEW_PARAM));
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : undefined;
}

/**
 * funcion helper para realizar peticiones a la API
 * ejecuta una peticion GET y convierte la respuesta JSON al tipo indicado.
 *
 * @param pathOrUrl Ruta relativa de la API o URL absoluta entregada por ella.
 * @param control Indica si esta petición debe actualizar `loading` y `error`.
 * @returns Respuesta JSON tipada como tipo genérico `T`.
 * @throws RickAndMortyApiError si falla la red, el HTTP o la lectura del JSON.
 */

async function request<T>(pathOrUrl: string, control: ApiRequestControl = {}): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const { trackLoading = true, reportError = true, timeoutMs = DEFAULT_TIMEOUT_MS } = control;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

  if (trackLoading) startLoading();
  if (reportError) travelStore.getState().setError(null);

  try {
    const previewStatus = getPreviewErrorStatus();
    if (previewStatus) {
      throw new RickAndMortyApiError(
        `Error HTTP ${previewStatus} simulado para revisar la interfaz.`,
        previewStatus,
      );
    }

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new RickAndMortyApiError(
        `La API respondió con el código ${response.status}`,
        response.status,
      );
    }

    // `await` permite que el catch también controle JSON inválido.
    return await response.json() as T;
  } catch (error: unknown) {
    const apiError = controller.signal.aborted
      ? new RickAndMortyApiError("La API no respondió dentro del tiempo esperado.", 408, error)
      : normalizeRickAndMortyError(error);
    if (reportError) travelStore.getState().setError(getRickAndMortyErrorView(apiError));
    throw apiError;
  } finally {
    // Se ejecuta tanto en éxito como en error.
    globalThis.clearTimeout(timeout);
    if (trackLoading) stopLoading();
  }
}

/**
 * Obtiene ubicaciones paginadas y filtradas.
 * Petición generada: GET /location?page=1&name=Earth&type=Planet
 *
 * @param filters Objeto tipado con página, nombre, tipo y dimensión opcionales.
 * @returns Página de ubicaciones junto con la información de paginación.
 *
 * @example
 * await getLocations({ page: 1, name: "Earth", type: "Planet" });
 */
export async function getLocations(filters: LocationsRequest = {}): Promise<ApiPage<Location>> {
  const { page = 1, name, type, dimension } = filters;
  const params = new URLSearchParams({ page: String(page) });
  if (name?.trim()) params.set("name", name.trim());
  if (type?.trim() && type !== "all") params.set("type", type.trim());
  if (dimension?.trim()) params.set("dimension", dimension.trim());
  return request<ApiPage<Location>>(`/location?${params.toString()}`);
}

/**
 * Obtiene personajes paginados y filtrados.
 * Petición generada: GET /character?page=1&status=alive&species=Human
 *
 * @param filters Objeto tipado con los filtros admitidos por `/character`.
 * @returns Página de personajes junto con la información de paginación.
 *
 * @example
 * await getCharacters({ status: "alive", species: "Human" });
 */
export async function getCharacters(filters: CharactersRequest = {}): Promise<ApiPage<Character>> {
  const { page = 1, name, status, species, type, gender } = filters;
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  if (name?.trim()) params.set("name", name.trim());
  if (species?.trim()) params.set("species", species.trim());
  if (type?.trim()) params.set("type", type.trim());
  if (gender) params.set("gender", gender);
  return request<ApiPage<Character>>(`/character?${params.toString()}`);
}

/**
 * Obtiene episodios paginados y filtrados.
 * Petición generada: GET /episode?page=1&episode=S01E01
 *
 * @param filters Objeto tipado con página, nombre o código de episodio.
 * @returns Página de episodios junto con la información de paginación.
 */
export async function getEpisodes(filters: EpisodesRequest = {}): Promise<ApiPage<Episode>> {
  const { page = 1, name, episode } = filters;
  const params = new URLSearchParams({ page: String(page) });
  if (name?.trim()) params.set("name", name.trim());
  if (episode?.trim()) params.set("episode", episode.trim());
  return request<ApiPage<Episode>>(`/episode?${params.toString()}`);
}

/**
 * Obtiene una ubicación completa por identificador.
 * Petición generada: GET /location/3
 *
 * @param input Objeto con el identificador de la ubicación.
 * @returns Ubicación solicitada, incluyendo sus URLs de residentes.
 */
export async function getLocation({ id }: ResourceByIdRequest): Promise<Location> {
  return request<Location>(`/location/${id}`);
}

/**
 * Obtiene varios personajes con una sola petición.
 * Petición generada: GET /character/1,2,3
 *
 * @param input Objeto que contiene los identificadores de personajes.
 * @param control Configuración opcional del estado global durante la petición.
 * @returns Arreglo normalizado; incluso un único resultado se devuelve como arreglo.
 */
export async function getCharactersByIds(
  { ids }: ResourcesByIdsRequest,
  control: ApiRequestControl = {},
): Promise<Character[]> {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  if (uniqueIds.length === 0) return [];

  const result = await request<Character | Character[]>(`/character/${uniqueIds.join(",")}`, control);
  return Array.isArray(result) ? result : [result];
}

/**
 * Obtiene varios episodios con una sola petición.
 * Petición generada: GET /episode/1,2,3
 *
 * @param input Objeto que contiene los identificadores de episodios.
 * @returns Arreglo normalizado de episodios.
 */
export async function getEpisodesByIds({ ids }: ResourcesByIdsRequest): Promise<Episode[]> {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  if (uniqueIds.length === 0) return [];

  const result = await request<Episode | Episode[]>(`/episode/${uniqueIds.join(",")}`);
  return Array.isArray(result) ? result : [result];
}

/**
 * Extrae el identificador numérico desde una URL relacionada de la API.
 *
 * @param url URL como `https://rickandmortyapi.com/api/character/1`.
 * @returns Identificador final de la URL; en el ejemplo devuelve `1`.
 */
export function getIdFromUrl(url: string): number {
  return Number(url.split("/").pop());
}

/** Parámetros comunes de los endpoints que devuelven resultados paginados. */
export interface PaginationRequest {
  /** Página solicitada. La API comienza en la página 1. */
  page?: number;
}

/** Filtros aceptados por GET /location. */
export interface LocationsRequest extends PaginationRequest {
  /** Coincidencia parcial por nombre de la ubicación. */
  name?: string;
  /** Tipo de ubicación: Planet, Space station, Microverse, etc. */
  type?: string;
  /** Dimensión exacta o parcial de la ubicación. */
  dimension?: string;
}

export type CharacterStatusFilter = "alive" | "dead" | "unknown";
export type CharacterGenderFilter = "female" | "male" | "genderless" | "unknown";

/** Filtros aceptados por GET /character. */
export interface CharactersRequest extends PaginationRequest {
  /** Coincidencia parcial por nombre del personaje. */
  name?: string;
  /** Estado vital del personaje. */
  status?: CharacterStatusFilter;
  /** Especie: Human, Alien, Humanoid, etc. */
  species?: string;
  /** Subtipo adicional entregado por la API. */
  type?: string;
  /** Género registrado por la API. */
  gender?: CharacterGenderFilter;
}

/** Filtros aceptados por GET /episode. */
export interface EpisodesRequest extends PaginationRequest {
  /** Coincidencia parcial por nombre del episodio. */
  name?: string;
  /** Código del episodio, por ejemplo S01E01. */
  episode?: string;
}

/** Entrada para consultar un único recurso por identificador. */
export interface ResourceByIdRequest {
  /** Identificador numérico del recurso en Rick and Morty API. */
  id: number;
}

/** Entrada para consultar varios recursos en una sola petición. */
export interface ResourcesByIdsRequest {
  /** Identificadores que se enviarán separados por comas en la URL. */
  ids: number[];
}

/** Configura cómo una petición afecta el estado global de la interfaz. */
export interface ApiRequestControl {
  /** Si es `false`, la petición no modifica `travelStore.loading`. */
  trackLoading?: boolean;
  /** Si es `false`, el error se lanza pero no se guarda en `travelStore.error`. */
  reportError?: boolean;
  /** Milisegundos máximos de espera antes de convertir la petición en un error 408. */
  timeoutMs?: number;
}

// Entradas tipadas evaluadas: filtros, IDs y control de las peticiones.
export interface PaginationRequest {
  page?: number;
}

export interface LocationsRequest extends PaginationRequest {
  name?: string;
  type?: string;
  dimension?: string;
}

export type CharacterStatusFilter = "alive" | "dead" | "unknown";
export type CharacterGenderFilter = "female" | "male" | "genderless" | "unknown";

export interface CharactersRequest extends PaginationRequest {
  name?: string;
  status?: CharacterStatusFilter;
  species?: string;
  type?: string;
  gender?: CharacterGenderFilter;
}

export interface ResourceByIdRequest {
  id: number;
}

export interface ResourcesByIdsRequest {
  ids: number[];
}

export interface ApiRequestControl {
  trackLoading?: boolean;
  reportError?: boolean;
}

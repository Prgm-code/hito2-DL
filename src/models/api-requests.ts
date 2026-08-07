export enum CharacterStatusFilter {
  ALIVE = 'alive',
  DEAD = 'dead',
  UNKNOWN = 'unknown',
}

export enum CharacterGenderFilter {
  FEMALE = 'female',
  MALE = 'male',
  GENDERLESS = 'genderless',
  UNKNOWN = 'unknown',
}

export interface PaginationRequest {
  page?: number;
}

export interface LocationsRequest extends PaginationRequest {
  name?: string;
  type?: string;
  dimension?: string;
}

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

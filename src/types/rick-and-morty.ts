export interface ApiReference {
  name: string;
  url: string;
}

export type CharacterStatus = "Alive" | "Dead" | "unknown";

export interface Character {
  id: number;
  name: string;
  status: CharacterStatus;
  species: string;
  type: string;
  gender: string;
  origin: ApiReference;
  location: ApiReference;
  image: string;
  episode: string[];
  url: string;
}

export interface Location {
  id: number;
  name: string;
  type: string;
  dimension: string;
  residents: string[];
  url: string;
}

export interface Episode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
  url: string;
}

export interface ApiInfo {
  count: number;
  pages: number;
  next: string | null;
  prev: string | null;
}

export interface ApiPage<T> {
  info: ApiInfo;
  results: T[];
}


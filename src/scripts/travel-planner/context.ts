import type { Character, Location } from 'models/rick-and-morty';

// Caché en memoria compartida por catálogo y formulario durante la sesión actual.
export const knownLocations = new Map<number, Location>();
export const locationPreviews = new Map<number, Character[]>();

// Catálogo de respaldo usado cuando un destino no tiene residentes vivos disponibles.
let baseCompanions: Character[] = [];

export function getBaseCompanions(): Character[] {
  return baseCompanions;
}

export function setBaseCompanions(characters: Character[]): void {
  baseCompanions = characters;
}

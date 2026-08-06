import {
  getCharactersByIds,
  getIdFromUrl,
  getLocations,
} from "../../services/rickAndMortyApi";
import { travelStore } from "../../stores/travelStore";
import type { Character, Location } from "../../types/rick-and-morty";
import { createApiErrorPanel } from "../../ui/apiErrorElements";
import { createDestinationCard, createEmptyState, createSkeletonCard, type RiskLabel } from "../../ui/appElements";
import { createElement } from "../../ui/dom";
import { calculateQuote } from "../../utils/travelRules";
import { knownLocations, locationPreviews } from "./context";
import { element } from "./helpers";

const PREVIEW_LIMIT = 3;
const SKELETON_COUNT = 6;

function locationRisk(location: Location): RiskLabel {
  return calculateQuote({ passengers: 1, tripType: "express", insurance: false }, location).risk;
}

function createLocationOptions(locations: Location[], placeholder: string): HTMLOptionElement[] {
  return [
    new Option(placeholder, ""),
    ...locations.map((location) => new Option(`${location.name} · ${location.dimension}`, String(location.id))),
  ];
}

function appendKnownSelection(select: HTMLSelectElement, id: string): void {
  if (!id || select.querySelector(`option[value="${id}"]`)) return;
  const location = knownLocations.get(Number(id));
  if (location) select.add(new Option(`${location.name} · ${location.dimension}`, id));
}

// Oculta solo la imagen fallida y recalcula el mosaico con las imágenes restantes.
export function hideBrokenDestinationImage(image: HTMLImageElement): void {
  const container = image.closest<HTMLElement>(".destination-photos");
  if (!container || image.hidden) return;
  image.hidden = true;
  const visibleImages = [...container.querySelectorAll<HTMLImageElement>("img")]
    .filter((candidate) => !candidate.hidden).length;
  container.style.gridTemplateColumns = visibleImages > 0 ? `repeat(${visibleImages}, 1fr)` : "1fr";
  const label = container.querySelector<HTMLElement>(".photo-label");
  if (label) label.hidden = visibleImages === 0;
}

export function renderCatalog(onRetry: () => void = () => void loadCatalog(1)): void {
  const state = travelStore.getState();
  const grid = element<HTMLDivElement>("#destination-grid");
  const status = element<HTMLDivElement>("#catalog-status");

  // Un error tiene prioridad para que Promise.all no deje esqueletos visibles
  // mientras terminan otras peticiones que ya no pueden completar la pantalla.
  if (state.error) {
    status.replaceChildren(createApiErrorPanel(state.error, onRetry));
    grid.replaceChildren();
  } else if (state.loading) {
    status.replaceChildren(createElement("span", { className: "spinner" }), document.createTextNode(" Sincronizando coordenadas..."));
    grid.replaceChildren(...Array.from({ length: SKELETON_COUNT }, createSkeletonCard));
  } else if (state.locations.length === 0) {
    status.replaceChildren(createEmptyState(
      "Sin coincidencias en esta dimensión",
      "Prueba con otro nombre o tipo de destino.",
      true,
    ));
    grid.replaceChildren();
  } else {
    status.textContent = `${state.locations.length} coordenadas encontradas en esta página`;
    grid.replaceChildren(...state.locations.map((location) =>
      createDestinationCard(location, locationPreviews.get(location.id) ?? [], locationRisk(location)),
    ));
  }

  element<HTMLSpanElement>("#page-status").textContent = `Página ${state.locationsPage} de ${state.totalLocationPages}`;
  const unavailable = state.loading || Boolean(state.error);
  element<HTMLButtonElement>("#previous-page").disabled = unavailable || state.locationsPage <= 1;
  element<HTMLButtonElement>("#next-page").disabled = unavailable || state.locationsPage >= state.totalLocationPages;
}

// Reconstruye ambos selects con la página actual sin perder valores ya elegidos.
export function updateLocationOptions(): void {
  const state = travelStore.getState();
  const origin = element<HTMLSelectElement>("#originId");
  const destination = element<HTMLSelectElement>("#destinationId");
  const previousOrigin = String(state.draft.originId || "");
  const previousDestination = String(state.draft.destinationId || "");

  origin.replaceChildren(...createLocationOptions(state.locations, "Selecciona un origen"));
  destination.replaceChildren(...createLocationOptions(state.locations, "Selecciona un destino"));

  // Conserva selecciones pertenecientes a otra página del catálogo.
  appendKnownSelection(origin, previousOrigin);
  appendKnownSelection(destination, previousDestination);
  origin.value = previousOrigin;
  destination.value = previousDestination;
}

export async function loadDestinationPreviews(locations: Location[]): Promise<void> {
  const residentIds = locations.flatMap((location) => location.residents.slice(0, PREVIEW_LIMIT).map(getIdFromUrl));
  if (!residentIds.length) return;

  try {
    const residents = await getCharactersByIds(
      { ids: residentIds },
      { trackLoading: false, reportError: false },
    );
    const byId = new Map(residents.map((resident) => [resident.id, resident]));
    locations.forEach((location) => {
      const previews = location.residents.slice(0, PREVIEW_LIMIT)
        .map(getIdFromUrl)
        .map((id) => byId.get(id))
        .filter((resident): resident is Character => Boolean(resident));
      locationPreviews.set(location.id, previews);
    });
    renderCatalog();
  } catch {
    // La ilustración generativa existente queda como respaldo cuando no hay imágenes.
  }
}

// El servicio controla loading/error; este módulo decide cómo reflejarlos en el catálogo.
export async function loadCatalog(page: number): Promise<void> {
  const state = travelStore.getState();
  const locationsRequest = getLocations({ page, name: state.search, type: state.typeFilter });

  // La llamada anterior activa `loading` de forma síncrona antes del primer `await`.
  renderCatalog();

  try {
    const response = await locationsRequest;
    response.results.forEach((location) => knownLocations.set(location.id, location));
    travelStore.getState().setCatalog(response.results, page, response.info.pages);
    updateLocationOptions();
    void loadDestinationPreviews(response.results);
  } catch {
    // El servicio ya dejó el error temático y tipado en Zustand.
  } finally {
    renderCatalog();
  }
}

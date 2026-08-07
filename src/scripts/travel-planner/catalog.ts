import { type RiskLevel, TripType } from 'models/reservation';
import type { Character, Location } from 'models/rick-and-morty';
import { knownLocations, locationPreviews } from 'scripts/travel-planner/context';
import { element } from 'scripts/travel-planner/helpers';
import { getCharactersByIds, getIdFromUrl, getLocations } from 'services/rickAndMortyApi';
import { travelStore } from 'stores/travelStore';
import { createApiErrorPanel } from 'ui/apiErrorElements';
import { createDestinationCard, createEmptyState, createSkeletonCard } from 'ui/appElements';
import { createElement } from 'ui/dom';
import { calculateQuote } from 'utils/travelRules';

const PREVIEW_LIMIT_PER_LOCATION = 3;
const SKELETON_COUNT = 6;

function locationRisk(location: Location): RiskLevel {
  return calculateQuote({ passengers: 1, tripType: TripType.EXPRESS, insurance: false }, location)
    .risk;
}

// Oculta solo la imagen fallida y recalcula el mosaico con las imágenes restantes.
export function hideBrokenDestinationImage(image: HTMLImageElement): void {
  const container = image.closest<HTMLElement>('.destination-photos');
  if (!container || image.hidden) return;
  image.hidden = true;
  const visibleImages = [...container.querySelectorAll<HTMLImageElement>('img')].filter(
    (candidate) => !candidate.hidden,
  ).length;
  container.style.gridTemplateColumns = visibleImages > 0 ? `repeat(${visibleImages}, 1fr)` : '1fr';
  const label = container.querySelector<HTMLElement>('.photo-label');
  if (label) label.hidden = visibleImages === 0;
}

export function renderCatalog(onRetry: () => void = () => void loadCatalog(1)): void {
  const state = travelStore.getState();
  const grid = element<HTMLDivElement>('#destination-grid');
  const status = element<HTMLDivElement>('#catalog-status');

  // Un error tiene prioridad para que Promise.all no deje esqueletos visibles
  // mientras terminan otras peticiones que ya no pueden completar la pantalla.
  if (state.error) {
    status.replaceChildren(createApiErrorPanel(state.error, onRetry));
    grid.replaceChildren();
  } else if (state.loading) {
    status.replaceChildren(
      createElement('span', { className: 'spinner' }),
      document.createTextNode(' Sincronizando coordenadas...'),
    );
    grid.replaceChildren(...Array.from({ length: SKELETON_COUNT }, createSkeletonCard));
  } else if (state.locations.length === 0) {
    status.replaceChildren(
      createEmptyState(
        'Sin coincidencias en esta dimensión',
        'Prueba con otro nombre o tipo de destino.',
        true,
      ),
    );
    grid.replaceChildren();
  } else {
    status.textContent = `${state.locations.length} coordenadas encontradas en esta página`;
    grid.replaceChildren(
      ...state.locations.map((location) =>
        createDestinationCard(
          location,
          locationPreviews.get(location.id) ?? [],
          locationRisk(location),
        ),
      ),
    );
  }

  element<HTMLSpanElement>('#page-status').textContent =
    `Página ${state.locationsPage} de ${state.totalLocationPages}`;
  const unavailable = state.loading || Boolean(state.error);
  element<HTMLButtonElement>('#previous-page').disabled = unavailable || state.locationsPage <= 1;
  element<HTMLButtonElement>('#next-page').disabled =
    unavailable || state.locationsPage >= state.totalLocationPages;
}

// Reconstruye el selector con la página actual sin perder el destino elegido.
export function updateLocationOptions(): void {
  const state = travelStore.getState();
  const destination = element<HTMLSelectElement>('#destinationId');
  const previousDestination = String(state.draft.destinationId || '');

  destination.replaceChildren(
    new Option('Selecciona un destino', ''),
    ...state.locations.map(
      (location) => new Option(`${location.name} · ${location.dimension}`, String(location.id)),
    ),
  );

  const selected = knownLocations.get(Number(previousDestination));
  if (selected && !destination.querySelector(`option[value="${previousDestination}"]`)) {
    destination.add(new Option(`${selected.name} · ${selected.dimension}`, previousDestination));
  }
  destination.value = previousDestination;
}

export async function loadDestinationPreviews(locations: Location[]): Promise<void> {
  const residentIds = locations.flatMap((location) =>
    location.residents.slice(0, PREVIEW_LIMIT_PER_LOCATION).map(getIdFromUrl),
  );
  if (!residentIds.length) return;

  try {
    const residents = await getCharactersByIds(
      { ids: residentIds },
      { trackLoading: false, reportError: false },
    );
    const byId = new Map(residents.map((resident) => [resident.id, resident]));
    locations.forEach((location) => {
      const previews = location.residents
        .slice(0, PREVIEW_LIMIT_PER_LOCATION)
        .map(getIdFromUrl)
        .map((id) => byId.get(id))
        .filter((resident): resident is Character => Boolean(resident));
      locationPreviews.set(location.id, previews);
    });
    renderCatalog();
  } catch {
    // El arte vectorial local permanece visible si el lote de retratos no responde.
  }
}

// El servicio controla loading/error; este módulo decide cómo reflejarlos en el catálogo.
export async function loadCatalog(page: number): Promise<void> {
  const state = travelStore.getState();
  // La pauta exige feedback visible antes de disparar la llamada de red.
  state.setError(null);
  state.setLoading(true);
  renderCatalog();

  try {
    const response = await getLocations({ page, name: state.search, type: state.typeFilter });
    response.results.forEach((location) => {
      knownLocations.set(location.id, location);
    });
    travelStore.getState().setCatalog(response.results, page, response.info.pages);
    updateLocationOptions();
    void loadDestinationPreviews(response.results);
  } catch {
    // El servicio ya dejó el error temático y tipado en Zustand.
  } finally {
    renderCatalog();
  }
}

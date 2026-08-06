import { getCharacters, getEpisodes, getLocations } from "../../services/rickAndMortyApi";
import { getRickAndMortyErrorView } from "../../services/rickAndMortyApiError";
import { travelStore } from "../../stores/travelStore";
import { renderCompanions, renderQuote } from "./booking";
import { loadDestinationPreviews, renderCatalog, updateLocationOptions } from "./catalog";
import { knownLocations, setBaseCompanions } from "./context";
import { bindEvents } from "./events";
import { renderReservations } from "./reservations";

// Barrel público de la funcionalidad para evitar imports profundos desde otros módulos.
export * from "./booking";
export * from "./catalog";
export * from "./context";
export * from "./events";
export * from "./helpers";
export * from "./notifications";
export * from "./reservations";

function updateCatalogCounters(locations: number, characters: number, episodes: number): void {
  document.querySelector("#location-count")?.replaceChildren(String(locations));
  document.querySelector("#character-count")?.replaceChildren(String(characters));
  document.querySelector("#episode-count")?.replaceChildren(String(episodes));
}

// Carga inicial separada para que el botón temático pueda reintentar sin duplicar listeners.
async function loadInitialData(): Promise<void> {
  const requests = [
    getLocations(),
    getCharacters(),
    getCharacters({ page: 1, status: "alive" }),
    getEpisodes(),
  ] as const;
  renderCatalog(() => void loadInitialData());

  try {
    // Construye el catálogo y los acompañantes mediante peticiones paralelas.
    const [locations, characters, aliveCharacters, episodes] = await Promise.all(requests);

    // actualiza el estado local con los resultados de la API
    locations.results.forEach((location) => knownLocations.set(location.id, location));
    setBaseCompanions(aliveCharacters.results);
    travelStore.getState().setCompanions(aliveCharacters.results);
    travelStore.getState().setCatalog(locations.results, 1, locations.info.pages);
    updateCatalogCounters(locations.info.count, characters.info.count, episodes.info.count);
    updateLocationOptions();
    renderCompanions();
    renderCatalog();
    void loadDestinationPreviews(locations.results);
  } catch (error) {
    // Espera sus `finally`: así loading queda en false antes de pintar el error.
    await Promise.allSettled(requests);
    travelStore.getState().setError(getRickAndMortyErrorView(error));
    renderCatalog(() => void loadInitialData());
  }
}

// Arranca listeners y estado local antes de consultar los catálogos remotos.
export async function initializeApp(): Promise<void> {
  bindEvents();
  renderReservations();
  renderQuote();
  await loadInitialData();
}

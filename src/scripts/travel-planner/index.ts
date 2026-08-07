import { CharacterStatusFilter } from "models/api-requests";
import { getCharacters, getLocations } from "services/rickAndMortyApi";
import { travelStore } from "stores/travelStore";
import { renderCompanions, renderQuote } from "scripts/travel-planner/booking";
import { loadDestinationPreviews, renderCatalog, updateLocationOptions } from "scripts/travel-planner/catalog";
import { knownLocations, setBaseCompanions } from "scripts/travel-planner/context";
import { bindEvents } from "scripts/travel-planner/events";
import { renderReservations } from "scripts/travel-planner/reservations";

// Carga inicial separada para que el botón temático pueda reintentar sin duplicar listeners.
async function loadInitialData(): Promise<void> {
  // Primero se inyecta el estado visual; después comienzan ambas peticiones.
  const state = travelStore.getState();
  state.setError(null);
  state.setLoading(true);
  renderCatalog(() => void loadInitialData());

  const requests = [
    getLocations(),
    getCharacters({ page: 1, status: CharacterStatusFilter.ALIVE }),
  ] as const;

  try {
    // Construye el catálogo y los acompañantes mediante peticiones paralelas.
    const [locations, aliveCharacters] = await Promise.all(requests);

    // actualiza el estado local con los resultados de la API
    locations.results.forEach((location) => knownLocations.set(location.id, location));
    setBaseCompanions(aliveCharacters.results);
    travelStore.getState().setCompanions(aliveCharacters.results);
    travelStore.getState().setCatalog(locations.results, 1, locations.info.pages);
    updateLocationOptions();
    renderCompanions();
    renderCatalog();
    void loadDestinationPreviews(locations.results);
  } catch {
    // El servicio ya guardó el error para que el catálogo lo muestre.
    renderCatalog(() => void loadInitialData());
  }
}

// Arranca listeners y estado local antes de consultar los catálogos remotos.
export async function initializeApp(): Promise<void> {
  if (!bindEvents()) return;
  renderReservations();
  renderQuote();
  await loadInitialData();
}

import { getCharacters, getLocations } from "../../services/rickAndMortyApi";
import { travelStore } from "../../stores/travelStore";
import { renderCompanions, renderQuote } from "./booking";
import { loadDestinationPreviews, renderCatalog, updateLocationOptions } from "./catalog";
import { knownLocations, setBaseCompanions } from "./context";
import { bindEvents } from "./events";
import { renderReservations } from "./reservations";

// Carga inicial separada para que el botón temático pueda reintentar sin duplicar listeners.
async function loadInitialData(): Promise<void> {
  const requests = [
    getLocations(),
    getCharacters({ page: 1, status: "alive" }),
  ] as const;
  renderCatalog(() => void loadInitialData());

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
  bindEvents();
  renderReservations();
  renderQuote();
  await loadInitialData();
}

import { travelStore } from "stores/travelStore";
import { PlannerView } from "models/reservation";
import {
  readDraft,
  renderBookingApiState,
  renderCompanions,
  renderQuote,
  showFormErrors,
  submitReservation,
  syncFormFromDraft,
  updateCompanions,
} from "scripts/travel-planner/booking";
import { hideBrokenDestinationImage, loadCatalog } from "scripts/travel-planner/catalog";
import { element, tomorrow } from "scripts/travel-planner/helpers";
import { showToast } from "scripts/travel-planner/notifications";
import { setActiveView } from "scripts/travel-planner/reservations";

const MAX_COMPANIONS = 3;
const SEARCH_DELAY_MS = 350;
let searchTimer: number | undefined;

function persistFormDraft(): void {
  travelStore.getState().setDraft(readDraft());
}

// La grilla se vuelve a renderizar; delegar el clic evita registrar listeners por tarjeta.
function bindDestinationSelection(destinationGrid: HTMLDivElement): void {
  destinationGrid.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("[data-book-location]");
    if (!button) return;
    const id = Number(button.dataset.bookLocation);
    travelStore.getState().setDraft({ destinationId: id, companionIds: [] });
    syncFormFromDraft();
    void updateCompanions(id);
    element("#reserva").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Destino añadido a tu ruta", "success");
  });
}

function bindBookingEvents(bookingForm: HTMLFormElement): void {
  element<HTMLInputElement>("#travelDate").min = tomorrow();
  bookingForm.addEventListener("submit", submitReservation);
  bookingForm.addEventListener("input", () => {
    persistFormDraft();
    showFormErrors([]);
    renderQuote();
  });
  element<HTMLSelectElement>("#destinationId").addEventListener("change", (event) => {
    travelStore.getState().setDraft({ companionIds: [] });
    renderCompanions();
    void updateCompanions(Number((event.currentTarget as HTMLSelectElement).value));
  });
  element<HTMLDivElement>("#companion-grid").addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    const checkbox = event.target.closest<HTMLInputElement>('input[name="companionIds"]');
    if (!checkbox) return;
    const selected = [...document.querySelectorAll<HTMLInputElement>('input[name="companionIds"]:checked')];
    if (selected.length > MAX_COMPANIONS) {
      checkbox.checked = false;
      showToast("Puedes elegir hasta tres personajes", "neutral");
    }
    persistFormDraft();
    renderCompanions();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = element<HTMLInputElement>("#passengers");
      input.value = String(Math.min(8, Math.max(1, Number(input.value) + Number(button.dataset.step))));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

// Paginación y filtros solo actualizan la store y solicitan nuevamente la página uno.
function bindCatalogEvents(): void {
  element<HTMLButtonElement>("#previous-page").addEventListener("click", () =>
    void loadCatalog(travelStore.getState().locationsPage - 1));
  element<HTMLButtonElement>("#next-page").addEventListener("click", () =>
    void loadCatalog(travelStore.getState().locationsPage + 1));
  element<HTMLSelectElement>("#type-filter").addEventListener("change", (event) => {
    const state = travelStore.getState();
    state.setFilters(state.search, (event.currentTarget as HTMLSelectElement).value);
    void loadCatalog(1);
  });
  element<HTMLInputElement>("#location-search").addEventListener("input", (event) => {
    window.clearTimeout(searchTimer);
    const search = (event.currentTarget as HTMLInputElement).value;
    searchTimer = window.setTimeout(() => {
      const state = travelStore.getState();
      state.setFilters(search, state.typeFilter);
      void loadCatalog(1);
    }, SEARCH_DELAY_MS);
  });
}

function bindNavigationEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.dataset.view;
      if (view === PlannerView.DESTINATIONS || view === PlannerView.RESERVATIONS) {
        setActiveView(view);
      }
    });
  });
  element<HTMLButtonElement>("#header-reservations").addEventListener("click", () => {
    setActiveView(PlannerView.RESERVATIONS);
    element(".catalog-column").scrollIntoView({ behavior: "smooth" });
  });
}

// Refleja automáticamente los cambios de loading/error de Zustand en el formulario.
function bindApiState(): void {
  travelStore.subscribe((state, previousState) => {
    if (state.loading !== previousState.loading || state.error !== previousState.error) {
      renderBookingApiState();
    }
  });
  renderBookingApiState();
}

export function bindEvents(): boolean {
  // Guardias explícitas de nulidad para los nodos raíz antes de registrar eventos.
  const bookingForm = document.getElementById("booking-form") as HTMLFormElement | null;
  const destinationGrid = document.getElementById("destination-grid") as HTMLDivElement | null;
  const reservationsList = document.getElementById("reservations-list") as HTMLDivElement | null;
  if (bookingForm === null || destinationGrid === null || reservationsList === null) {
    console.error("No fue posible iniciar la aplicación: faltan elementos principales del DOM.");
    return false;
  }

  // La captura permite manejar errores de imágenes, que no hacen bubble normalmente.
  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.closest(".destination-photos")) {
      hideBrokenDestinationImage(event.target);
    }
  }, true);
  bindDestinationSelection(destinationGrid);
  bindBookingEvents(bookingForm);
  bindCatalogEvents();
  bindNavigationEvents();
  bindApiState();
  return true;
}

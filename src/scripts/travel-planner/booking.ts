import { getCharactersByIds, getIdFromUrl } from "../../services/rickAndMortyApi";
import { travelStore } from "../../stores/travelStore";
import type { Character, Location } from "../../types/rick-and-morty";
import type { Reservation, ReservationDraft, TripType } from "../../types/reservation";
import {
  appendDestinationHint,
  appendFormErrors,
  createCompanionCard,
  setRiskContent,
} from "../../ui/appElements";
import { createApiFormErrorNotice, createApiFormLoadingNotice } from "../../ui/apiErrorElements";
import { createElement } from "../../ui/dom";
import { calculateQuote, formatCredits, requiresInsurance, validateReservation } from "../../utils/travelRules";
import { getBaseCompanions, knownLocations } from "./context";
import { loadCatalog } from "./catalog";
import { element } from "./helpers";
import { showToast } from "./notifications";
import { renderReservations, setActiveView } from "./reservations";

type FormValueControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const INSURANCE_COPY = {
  mandatory: "Obligatorio en dimensiones desconocidas",
  optional: "Cobertura ante portales inestables",
} as const;

// Evita repetir conversiones al sincronizar el store con los controles del formulario.
function setControlValue(selector: string, value: string | number): void {
  element<FormValueControl>(selector).value = String(value);
}

function uniqueCharacters(characters: Character[]): Character[] {
  const seen = new Set<number>();
  return characters.filter((character) => {
    if (seen.has(character.id)) return false;
    seen.add(character.id);
    return true;
  });
}

/**
 * Bloquea únicamente los controles que necesitan datos remotos.
 * Los datos personales escritos por el pasajero se conservan durante el error.
 */
export function renderBookingApiState(): void {
  const { loading, error } = travelStore.getState();
  const blocked = loading || Boolean(error);
  const form = element<HTMLFormElement>("#booking-form");
  const status = element<HTMLDivElement>("#booking-api-status");
  const companionGrid = element<HTMLDivElement>("#companion-grid");
  const submit = element<HTMLButtonElement>("#confirm-booking");

  element<HTMLSelectElement>("#originId").disabled = blocked;
  element<HTMLSelectElement>("#destinationId").disabled = blocked;
  submit.disabled = blocked;
  companionGrid.querySelectorAll<HTMLInputElement>('input[name="companionIds"]')
    .forEach((input) => { input.disabled = blocked; });
  companionGrid.classList.toggle("pointer-events-none", blocked);
  companionGrid.classList.toggle("opacity-50", blocked);
  companionGrid.setAttribute("aria-disabled", String(blocked));
  form.setAttribute("aria-busy", String(loading));

  submit.querySelector("span")?.replaceChildren(
    loading ? "Sincronizando catálogo..." : error ? "Portal no disponible" : "Confirmar reserva",
  );

  status.hidden = !blocked;
  if (error) {
    status.replaceChildren(createApiFormErrorNotice(error, () => void loadCatalog(1)));
  } else if (loading) {
    status.replaceChildren(createApiFormLoadingNotice());
  } else {
    status.replaceChildren();
  }
}

function createReservation(
  draft: ReservationDraft,
  origin: Location,
  destination: Location,
  companions: Character[],
): Reservation {
  const now = new Date();
  return {
    ...draft,
    id: crypto.randomUUID(),
    number: `PT-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    status: "Confirmada",
    createdAt: now.toISOString(),
    origin: { id: origin.id, name: origin.name, dimension: origin.dimension, type: origin.type },
    destination: { id: destination.id, name: destination.name, dimension: destination.dimension, type: destination.type },
    companions: companions.map(({ id, name, image, species, status }) => ({ id, name, image, species, status })),
    quote: calculateQuote(draft, destination),
  };
}

// Renderiza el selector de equipo desde el borrador persistido en Zustand.
export function renderCompanions(): void {
  const { companions, draft, loading, error } = travelStore.getState();
  const grid = element<HTMLDivElement>("#companion-grid");
  element("#companion-status").textContent = `${draft.companionIds.length} / 3`;

  if (!companions.length) {
    grid.replaceChildren(createElement("p", { text: "No hay personajes vivos disponibles para esta ruta." }));
    return;
  }
  grid.replaceChildren(...companions.map((character) =>
    createCompanionCard(character, draft.companionIds.includes(character.id)),
  ));
  if (loading || error) {
    grid.querySelectorAll<HTMLInputElement>('input[name="companionIds"]')
      .forEach((input) => { input.disabled = true; });
  }
}

export function renderQuote(): void {
  const { draft } = travelStore.getState();
  const destination = knownLocations.get(draft.destinationId);
  const quote = calculateQuote(draft, destination);
  const hint = element<HTMLDivElement>("#destination-hint");

  element("#price-value").textContent = formatCredits(quote.total);
  setRiskContent(element<HTMLElement>("#risk-value"), quote.risk);
  if (destination) {
    hint.hidden = false;
    appendDestinationHint(hint, destination);
  } else {
    hint.hidden = true;
  }

  const insurance = element<HTMLInputElement>("#insurance");
  const mandatory = requiresInsurance(destination);
  if (mandatory && !draft.insurance) {
    travelStore.getState().setDraft({ insurance: true });
    insurance.checked = true;
    element("#insurance-copy").textContent = INSURANCE_COPY.mandatory;
    renderQuote();
    return;
  }
  element("#insurance-copy").textContent = mandatory ? INSURANCE_COPY.mandatory : INSURANCE_COPY.optional;
}

// Prioriza residentes vivos del destino y completa el selector con el catálogo base.
export async function updateCompanions(destinationId: number): Promise<void> {
  const destination = knownLocations.get(destinationId);
  if (!destination) {
    travelStore.getState().setCompanions(getBaseCompanions());
    renderCompanions();
    return;
  }

  const residentIds = destination.residents.slice(0, 30).map(getIdFromUrl);
  try {
    const residents = (await getCharactersByIds({ ids: residentIds }))
      .filter((character) => character.status === "Alive");
    travelStore.getState().setCompanions(uniqueCharacters([...residents, ...getBaseCompanions()]));
  } catch {
    travelStore.getState().setCompanions(getBaseCompanions());
  }
  renderCompanions();
}

export function readDraft(): ReservationDraft {
  const data = new FormData(element<HTMLFormElement>("#booking-form"));
  return {
    passengerName: String(data.get("passengerName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    originId: Number(data.get("originId")),
    destinationId: Number(data.get("destinationId")),
    travelDate: String(data.get("travelDate") ?? ""),
    passengers: Number(data.get("passengers")) || 1,
    companionIds: data.getAll("companionIds").map(Number).filter(Number.isFinite),
    tripType: String(data.get("tripType") ?? "express") as TripType,
    insurance: data.get("insurance") === "on",
    comments: String(data.get("comments") ?? "").trim(),
  };
}

export function syncFormFromDraft(): void {
  const draft = travelStore.getState().draft;
  setControlValue("#passengerName", draft.passengerName);
  setControlValue("#email", draft.email);
  setControlValue("#originId", draft.originId || "");
  setControlValue("#destinationId", draft.destinationId || "");
  setControlValue("#travelDate", draft.travelDate);
  setControlValue("#passengers", draft.passengers);
  element<HTMLInputElement>("#insurance").checked = draft.insurance;
  setControlValue("#comments", draft.comments);
  element<HTMLInputElement>(`input[name="tripType"][value="${draft.tripType}"]`).checked = true;
  renderCompanions();
  renderQuote();
}

export function showFormErrors(errors: string[]): void {
  const box = element<HTMLDivElement>("#form-errors");
  box.hidden = errors.length === 0;
  if (errors.length) appendFormErrors(box, errors);
  else box.replaceChildren();
}

export function submitReservation(event: SubmitEvent): void {
  event.preventDefault();
  const apiState = travelStore.getState();
  if (apiState.loading || apiState.error) {
    renderBookingApiState();
    return;
  }

  const draft = readDraft();
  travelStore.getState().setDraft(draft);
  const origin = knownLocations.get(draft.originId);
  const destination = knownLocations.get(draft.destinationId);
  const companions = travelStore.getState().companions
    .filter((character) => draft.companionIds.includes(character.id));
  const errors = validateReservation(draft, destination, companions);
  if (!origin) errors.push("El origen seleccionado ya no está disponible.");
  if (!destination) errors.push("El destino seleccionado ya no está disponible.");
  showFormErrors(errors);
  if (errors.length || !origin || !destination) return;

  const reservation = createReservation(draft, origin, destination, companions);

  travelStore.getState().addReservation(reservation);
  renderReservations();
  showToast(`Reserva ${reservation.number} confirmada`);
  travelStore.getState().resetDraft();
  element<HTMLFormElement>("#booking-form").reset();
  syncFormFromDraft();
  setActiveView("reservations");
  element("[data-panel='reservations']").scrollIntoView({ behavior: "smooth", block: "start" });
}

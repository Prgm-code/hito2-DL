import {
  PlannerView,
  type Reservation,
  type ReservationDraft,
  ReservationStatus,
  TripType,
} from 'models/reservation';
import { type Character, CharacterStatus, type Location } from 'models/rick-and-morty';
import { loadCatalog } from 'scripts/travel-planner/catalog';
import { getBaseCompanions, knownLocations } from 'scripts/travel-planner/context';
import { element } from 'scripts/travel-planner/helpers';
import { showToast } from 'scripts/travel-planner/notifications';
import { renderReservations, setActiveView } from 'scripts/travel-planner/reservations';
import { getCharactersByIds, getIdFromUrl } from 'services/rickAndMortyApi';
import { travelStore } from 'stores/travelStore';
import { createApiFormErrorNotice, createApiFormLoadingNotice } from 'ui/apiErrorElements';
import {
  appendDestinationHint,
  appendFormErrors,
  createCompanionCard,
  setRiskContent,
} from 'ui/appElements';
import { createElement } from 'ui/dom';
import {
  calculateQuote,
  formatCredits,
  requiresInsurance,
  validateReservation,
} from 'utils/travelRules';

type FormValueControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const INSURANCE_COPY = {
  mandatory: 'Obligatorio en dimensiones desconocidas',
  optional: 'Cobertura ante portales inestables',
} as const;
const DESTINATION_RESIDENT_LIMIT = 16;
const COMPANION_OPTION_LIMIT = 20;

function parseTripType(value: FormDataEntryValue | null): TripType {
  const tripType = String(value ?? '');
  if (tripType === TripType.EXPRESS) return TripType.EXPRESS;
  if (tripType === TripType.EXPLORATION) return TripType.EXPLORATION;
  if (tripType === TripType.PREMIUM) return TripType.PREMIUM;
  return TripType.EXPRESS;
}

// Evita repetir conversiones al sincronizar el store con los controles del formulario.
function setControlValue(selector: string, value: string | number): void {
  element<FormValueControl>(selector).value = String(value);
}

function uniqueCharacters(characters: Character[]): Character[] {
  return [...new Map(characters.map((character) => [character.id, character])).values()];
}

/**
 * Bloquea únicamente los controles que necesitan datos remotos.
 * Los datos personales escritos por el pasajero se conservan durante el error.
 */
export function renderBookingApiState(): void {
  const { loading, error } = travelStore.getState();
  const blocked = loading || Boolean(error);
  const form = element<HTMLFormElement>('#booking-form');
  const status = element<HTMLDivElement>('#booking-api-status');
  const companionGrid = element<HTMLDivElement>('#companion-grid');
  const submit = element<HTMLButtonElement>('#confirm-booking');

  element<HTMLSelectElement>('#destinationId').disabled = blocked;
  submit.disabled = blocked;
  companionGrid
    .querySelectorAll<HTMLInputElement>('input[name="companionIds"]')
    .forEach((input) => {
      input.disabled = blocked;
    });
  companionGrid.classList.toggle('pointer-events-none', blocked);
  companionGrid.classList.toggle('opacity-50', blocked);
  companionGrid.setAttribute('aria-disabled', String(blocked));
  form.setAttribute('aria-busy', String(loading));

  submit
    .querySelector('span')
    ?.replaceChildren(
      loading ? 'Sincronizando catálogo...' : error ? 'Portal no disponible' : 'Confirmar reserva',
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
  destination: Location,
  companions: Character[],
): Reservation {
  const now = new Date();
  return {
    ...draft,
    id: crypto.randomUUID(),
    number: `PT-${now.getFullYear()}-${String(Date.now()).slice(-6)}`,
    status: ReservationStatus.CONFIRMED,
    createdAt: now.toISOString(),
    destination: {
      id: destination.id,
      name: destination.name,
      dimension: destination.dimension,
      type: destination.type,
    },
    companions: companions.map(({ id, name, image, species, status }) => ({
      id,
      name,
      image,
      species,
      status,
    })),
    quote: calculateQuote(draft, destination),
  };
}

// Renderiza el selector de equipo desde el borrador persistido en Zustand.
export function renderCompanions(): void {
  const { companions, draft, loading, error } = travelStore.getState();
  const grid = element<HTMLDivElement>('#companion-grid');
  element('#companion-status').textContent = `${draft.companionIds.length} / 3`;

  if (!companions.length) {
    grid.replaceChildren(
      createElement('p', { text: 'No hay personajes vivos disponibles para esta ruta.' }),
    );
    return;
  }
  grid.replaceChildren(
    ...companions.map((character) =>
      createCompanionCard(character, draft.companionIds.includes(character.id)),
    ),
  );
  if (loading || error) {
    grid.querySelectorAll<HTMLInputElement>('input[name="companionIds"]').forEach((input) => {
      input.disabled = true;
    });
  }
}

export function renderQuote(): void {
  const state = travelStore.getState();
  let draft = state.draft;
  const destination = knownLocations.get(draft.destinationId);
  const hint = element<HTMLDivElement>('#destination-hint');
  const insurance = element<HTMLInputElement>('#insurance');
  const mandatory = requiresInsurance(destination);

  if (mandatory && !draft.insurance) {
    state.setDraft({ insurance: true });
    insurance.checked = true;
    draft = { ...draft, insurance: true };
  }

  const quote = calculateQuote(draft, destination);
  element('#price-value').textContent = formatCredits(quote.total);
  setRiskContent(element<HTMLElement>('#risk-value'), quote.risk);
  if (destination) {
    hint.hidden = false;
    appendDestinationHint(hint, destination);
  } else {
    hint.hidden = true;
  }

  element('#insurance-copy').textContent = mandatory
    ? INSURANCE_COPY.mandatory
    : INSURANCE_COPY.optional;
}

// Prioriza residentes vivos del destino y completa el selector con el catálogo base.
export async function updateCompanions(destinationId: number): Promise<void> {
  const destination = knownLocations.get(destinationId);
  if (!destination) {
    travelStore.getState().setCompanions(getBaseCompanions());
    renderCompanions();
    return;
  }

  const residentIds = destination.residents.slice(0, DESTINATION_RESIDENT_LIMIT).map(getIdFromUrl);
  try {
    const residents = (await getCharactersByIds({ ids: residentIds })).filter(
      (character) => character.status === CharacterStatus.ALIVE,
    );
    travelStore
      .getState()
      .setCompanions(
        uniqueCharacters([...residents, ...getBaseCompanions()]).slice(0, COMPANION_OPTION_LIMIT),
      );
  } catch {
    travelStore.getState().setCompanions(getBaseCompanions());
  }
  renderCompanions();
}

// Evidencia evaluada: FormData, limpieza de textos y conversión de tipos.
export function readDraft(): ReservationDraft {
  const data = new FormData(element<HTMLFormElement>('#booking-form'));
  return {
    passengerName: String(data.get('passengerName') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    destinationId: Number(data.get('destinationId')),
    travelDate: String(data.get('travelDate') ?? ''),
    passengers: Number(data.get('passengers')) || 1,
    companionIds: data.getAll('companionIds').map(Number).filter(Number.isFinite),
    tripType: parseTripType(data.get('tripType')),
    insurance: data.get('insurance') === 'on',
    comments: String(data.get('comments') ?? '').trim(),
  };
}

export function syncFormFromDraft(): void {
  const draft = travelStore.getState().draft;
  setControlValue('#passengerName', draft.passengerName);
  setControlValue('#email', draft.email);
  setControlValue('#destinationId', draft.destinationId || '');
  setControlValue('#travelDate', draft.travelDate);
  setControlValue('#passengers', draft.passengers);
  element<HTMLInputElement>('#insurance').checked = draft.insurance;
  setControlValue('#comments', draft.comments);
  element<HTMLInputElement>(`input[name="tripType"][value="${draft.tripType}"]`).checked = true;
  renderCompanions();
  renderQuote();
}

export function showFormErrors(errors: string[]): void {
  const box = element<HTMLDivElement>('#form-errors');
  box.hidden = errors.length === 0;
  if (errors.length) appendFormErrors(box, errors);
  else box.replaceChildren();
}

// Evidencia evaluada: evita el submit nativo, valida y actualiza el DOM/estado.
export function submitReservation(event: SubmitEvent): void {
  event.preventDefault();
  const apiState = travelStore.getState();
  if (apiState.loading || apiState.error) {
    renderBookingApiState();
    return;
  }

  const draft = readDraft();
  travelStore.getState().setDraft(draft);
  const destination = knownLocations.get(draft.destinationId);
  const companions = travelStore
    .getState()
    .companions.filter((character) => draft.companionIds.includes(character.id));
  const errors = validateReservation(draft, destination, companions);
  if (!destination) errors.push('El destino seleccionado ya no está disponible.');
  showFormErrors(errors);
  if (errors.length || !destination) return;

  const reservation = createReservation(draft, destination, companions);

  travelStore.getState().addReservation(reservation);
  renderReservations();
  showToast(`Reserva ${reservation.number} confirmada`);
  travelStore.getState().resetDraft();
  element<HTMLFormElement>('#booking-form').reset();
  syncFormFromDraft();
  setActiveView(PlannerView.RESERVATIONS);
  element("[data-panel='reservations']").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

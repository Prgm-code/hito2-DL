import { getCharactersByIds, getEpisodesByIds, getIdFromUrl, getLocation } from "services/rickAndMortyApi";
import { getRickAndMortyErrorView, type ApiErrorView } from "services/rickAndMortyApiError";
import { travelStore } from "stores/travelStore";
import type { Character, Episode, Location } from "models/rick-and-morty";
import { ReservationStatus, type Reservation } from "models/reservation";
import {
  createCharacterModal,
  createEpisodeModal,
  createJourneyError,
  createJourneyView,
} from "ui/journeyElements";
import { formatCredits } from "utils/travelRules";
import { element } from "scripts/travel-planner/helpers";

const MAX_JOURNEY_RESIDENTS = 24;
const MAX_JOURNEY_EPISODES = 40;

function reservationCompanionIds(reservation: Reservation): number[] {
  if (Array.isArray(reservation.companions)) return reservation.companions.map((character) => character.id);
  return reservation.companion ? [reservation.companion.id] : reservation.companionId ? [reservation.companionId] : [];
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function bindRelationToggles(content: HTMLElement): void {
  content.querySelectorAll<HTMLButtonElement>("[data-expand-relation]").forEach((button) => {
    button.addEventListener("click", () => {
      const relation = button.dataset.expandRelation ?? "";
      const block = content.querySelector<HTMLElement>(`[data-relation="${relation}"]`);
      if (!block) return;
      const expanded = block.classList.toggle("expanded");
      button.textContent = expanded
        ? "Mostrar menos ↑"
        : `Mostrar los ${button.dataset.total} ${relation === "episodes" ? "capítulos" : "personajes"} ↓`;
    });
  });
}

function bindDetailModals(content: HTMLElement, residents: Character[], episodes: Episode[]): void {
  const modal = element<HTMLDialogElement>("#details-modal");
  const modalContent = element<HTMLDivElement>("#modal-content");
  const characterMap = new Map(residents.map((resident) => [resident.id, resident]));
  const episodeMap = new Map(episodes.map((episode) => [episode.id, episode]));

  content.querySelectorAll<HTMLButtonElement>("[data-character-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const character = characterMap.get(Number(button.dataset.characterId));
      if (!character) return;
      modalContent.replaceChildren(createCharacterModal(character, episodeMap));
      modal.showModal();
    });
  });

  content.querySelectorAll<HTMLButtonElement>("[data-episode-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const episode = episodeMap.get(Number(button.dataset.episodeId));
      if (!episode) return;
      modalContent.replaceChildren(createEpisodeModal(episode, residents));
      modal.showModal();
    });
  });

  element<HTMLButtonElement>("[data-close-modal]").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
}

function bindJourneyCompletion(content: HTMLElement): void {
  const button = content.querySelector<HTMLButtonElement>("[data-complete-journey]");
  if (!button || button.disabled) return;

  button.addEventListener("click", () => {
    const reservationId = button.dataset.completeJourney ?? "";
    travelStore.getState().completeReservation(reservationId);
    const completed = travelStore.getState().reservations.find((item) => item.id === reservationId);
    if (completed?.status !== ReservationStatus.COMPLETED) return;

    button.disabled = true;
    button.textContent = "Viaje completado ✓";
    content.querySelector<HTMLElement>("[data-journey-finale]")?.classList.add("completed");
    const kicker = content.querySelector<HTMLElement>("[data-finale-kicker]");
    const title = content.querySelector<HTMLElement>("[data-finale-title]");
    const copy = content.querySelector<HTMLElement>("[data-finale-copy]");
    if (kicker) kicker.textContent = "EXPEDICIÓN COMPLETADA";
    if (title) title.textContent = "Viaje completado con éxito.";
    if (copy) copy.textContent = "La expedición quedó registrada como completada en este dispositivo.";
  }, { once: true });
}

function renderJourney(
  reservation: Reservation,
  destination: Location,
  characters: Character[],
  episodes: Episode[],
  residents: Character[],
): void {
  const residentIds = new Set(residents.map((resident) => resident.id));
  const relatedEpisodes = episodes.filter((episode) =>
    episode.characters.some((characterUrl) => residentIds.has(getIdFromUrl(characterUrl))),
  );
  const content = element<HTMLDivElement>("#journey-content");
  content.replaceChildren(createJourneyView({
    reservation,
    destination,
    characters,
    residents,
    episodes,
    relatedEpisodes,
    date: formatDate(reservation.travelDate),
    teamNames: characters.length ? characters.map((character) => character.name).join(", ") : "sin acompañantes asignados",
    formattedTotal: formatCredits(reservation.quote.total),
  }));

  element("#journey-loading").hidden = true;
  content.hidden = false;
  bindRelationToggles(content);
  bindDetailModals(content, residents, episodes);
  bindJourneyCompletion(content);
}

function renderError(error: ApiErrorView | string): void {
  const loading = element("#journey-loading");
  loading.replaceChildren(createJourneyError(error));
  const retry = loading.querySelector<HTMLButtonElement>("[data-retry-journey]");
  if (!retry) return;
  retry.addEventListener("click", () => window.location.reload(), { once: true });
}

async function initializeJourney(): Promise<void> {
  const reservationId = new URLSearchParams(window.location.search).get("id");
  const reservation = travelStore.getState().reservations.find((item) => item.id === reservationId);
  if (!reservation) return renderError("No encontramos esa reserva en este dispositivo.");
  if (reservation.status === ReservationStatus.CANCELLED) return renderError("Esta reserva está cancelada y no puede iniciar el viaje.");

  travelStore.getState().startReservation(reservation.id);
  const activeReservation = travelStore.getState().reservations.find((item) => item.id === reservation.id) ?? reservation;

  try {
    const destination = await getLocation({ id: activeReservation.destination.id });
    const companionIds = reservationCompanionIds(activeReservation);
    const residentIds = destination.residents.slice(0, MAX_JOURNEY_RESIDENTS).map(getIdFromUrl);
    const people = await getCharactersByIds(
      { ids: [...companionIds, ...residentIds] },
      { trackLoading: false, reportError: false },
    );
    const characters = companionIds.map((id) => people.find((person) => person.id === id)).filter((person): person is Character => Boolean(person));
    const residents = residentIds.map((id) => people.find((person) => person.id === id)).filter((person): person is Character => Boolean(person));
    const episodeIds = [...characters, ...residents]
      .flatMap((character) => character.episode.map(getIdFromUrl));
    const episodes = (await getEpisodesByIds(
      { ids: episodeIds.slice(0, MAX_JOURNEY_EPISODES) },
      { trackLoading: false, reportError: false },
    )).sort((first, second) => first.id - second.id);
    renderJourney(activeReservation, destination, characters, episodes, residents);
  } catch (error) {
    renderError(getRickAndMortyErrorView(error));
  }
}

void initializeJourney();

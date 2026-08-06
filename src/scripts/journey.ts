import { getCharactersByIds, getEpisodesByIds, getIdFromUrl, getLocation } from "../services/rickAndMortyApi";
import { getRickAndMortyErrorView, type ApiErrorView } from "../services/rickAndMortyApiError";
import { travelStore } from "../stores/travelStore";
import type { Character, Episode, Location } from "../types/rick-and-morty";
import type { Reservation } from "../types/reservation";
import {
  createCharacterModal,
  createEpisodeModal,
  createJourneyError,
  createJourneyView,
} from "../ui/journeyElements";
import { formatCredits } from "../utils/travelRules";

function element<T extends HTMLElement>(selector: string): T {
  const match = document.querySelector<T>(selector);
  if (!match) throw new Error(`No se encontró ${selector}`);
  return match;
}

function reservationCompanionIds(reservation: Reservation): number[] {
  if (Array.isArray(reservation.companions)) return reservation.companions.map((character) => character.id);
  return reservation.companion ? [reservation.companion.id] : reservation.companionId ? [reservation.companionId] : [];
}

function episodeCode(url: string): number {
  return getIdFromUrl(url);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

/**
 * Divide identificadores para evitar construir URLs excesivamente largas.
 *
 * @param ids Identificadores que se dividirán en grupos.
 * @param batchSize Cantidad máxima de identificadores por petición.
 * @returns Arreglo con los grupos de identificadores.
 */
function createBatches(ids: number[], batchSize = 20): number[][] {
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  return Array.from({ length: Math.ceil(uniqueIds.length / batchSize) }, (_, index) =>
    uniqueIds.slice(index * batchSize, (index + 1) * batchSize),
  );
}

/**
 * Recupera todos los personajes solicitados usando peticiones múltiples tipadas.
 *
 * @param ids Identificadores de personajes relacionados con el destino o el equipo.
 * @returns Personajes obtenidos en todos los lotes que respondieron correctamente.
 */
async function getCharactersInBatches(ids: number[]): Promise<Character[]> {
  const responses = await Promise.allSettled(
    createBatches(ids).map((batch) => getCharactersByIds({ ids: batch })),
  );
  return responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
}

/**
 * Recupera los episodios relacionados en grupos de veinte identificadores.
 *
 * @param ids Identificadores de episodios obtenidos desde los personajes residentes.
 * @returns Episodios recuperados, ordenados posteriormente por su identificador.
 */
async function getEpisodesInBatches(ids: number[]): Promise<Episode[]> {
  const responses = await Promise.allSettled(
    createBatches(ids).map((batch) => getEpisodesByIds({ ids: batch })),
  );
  return responses.flatMap((response) => response.status === "fulfilled" ? response.value : []);
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
  modal.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }, true);
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
  content.addEventListener("error", (event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.closest(".resident-portrait")) image.hidden = true;
  }, true);
}

function renderError(error: ApiErrorView | string): void {
  const loading = element("#journey-loading");
  loading.replaceChildren(createJourneyError(error));
  loading.querySelector<HTMLButtonElement>("[data-retry-journey]")
    ?.addEventListener("click", () => window.location.reload());
}

async function initializeJourney(): Promise<void> {
  const reservationId = new URLSearchParams(window.location.search).get("id");
  const reservation = travelStore.getState().reservations.find((item) => item.id === reservationId);
  if (!reservation) return renderError("No encontramos esa reserva en este dispositivo.");
  if (reservation.status === "Cancelada") return renderError("Esta reserva está cancelada y no puede iniciar el viaje.");

  travelStore.getState().startReservation(reservation.id);
  const activeReservation = travelStore.getState().reservations.find((item) => item.id === reservation.id) ?? reservation;

  try {
    const destination = await getLocation({ id: activeReservation.destination.id });
    const companionIds = reservationCompanionIds(activeReservation);
    const residentIds = destination.residents.map(getIdFromUrl);
    const people = await getCharactersInBatches([...companionIds, ...residentIds]);
    const characters = companionIds.map((id) => people.find((person) => person.id === id)).filter((person): person is Character => Boolean(person));
    const residents = residentIds.map((id) => people.find((person) => person.id === id)).filter((person): person is Character => Boolean(person));
    const episodeIds = [...characters, ...residents].flatMap((character) => character.episode.map(episodeCode));
    const episodes = (await getEpisodesInBatches(episodeIds)).sort((first, second) => first.id - second.id);
    renderJourney(activeReservation, destination, characters, episodes, residents);
  } catch (error) {
    renderError(getRickAndMortyErrorView(error));
  }
}

void initializeJourney();

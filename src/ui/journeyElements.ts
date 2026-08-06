import { getIdFromUrl } from "../services/rickAndMortyApi";
import type { ApiErrorView } from "../services/rickAndMortyApiError";
import type { Character, Episode, Location } from "../types/rick-and-morty";
import type { Reservation } from "../types/reservation";
import { createElement, createFragment, createImage } from "./dom";

type RelationKind = "residents" | "episodes";

function characterDescription(character: Character): string {
  return `${character.species}${character.type ? ` · ${character.type}` : ""}`;
}

// Piezas pequeñas reutilizadas por la bitácora y los modales.
function createLogHeading(kicker: string, title: string, copy: string): HTMLDivElement {
  return createElement("div", { className: "log-heading" },
    createElement("span", { text: kicker }),
    createElement("h2", { text: title }),
    createElement("p", { text: copy }),
  );
}

function createStatus(status: Character["status"]): HTMLSpanElement {
  return createElement("span", { className: `resident-status ${status.toLowerCase()}` }, createElement("i"), status);
}

function createDefinition(label: string, value: string | number): HTMLDivElement {
  return createElement("div", {}, createElement("dt", { text: label }), createElement("dd", { text: value }));
}

// Cards de personajes y episodios relacionados.
export function createCharacterStory(character: Character, episodeMap: Map<number, Episode>): HTMLElement {
  const episodes = character.episode.slice(0, 3)
    .map(getIdFromUrl)
    .map((id) => episodeMap.get(id))
    .filter((episode): episode is Episode => Boolean(episode));
  const history = createElement("ol");
  if (episodes.length) {
    episodes.forEach((episode) => history.append(createElement("li", {},
      createElement("span", { text: episode.episode }),
      createElement("b", { text: episode.name }),
      createElement("small", { text: episode.air_date }),
    )));
  } else {
    history.append(createElement("li", {}, createElement("b", { text: "Sin registros de episodios recuperados" })));
  }

  const profileImage = createImage(character.image, `Retrato de ${character.name}`);
  const profile = createElement("div", { className: "story-profile" },
    profileImage,
    createElement("div", {},
      createElement("span", { className: "alive-signal" }, createElement("i"), character.status),
      createElement("h3", { text: character.name }),
      createElement("p", { text: characterDescription(character) }),
    ),
  );
  const story = createElement("p", { className: "character-story" },
    createElement("b", { text: character.name }),
    ` se originó en ${character.origin.name}. Su última señal conocida proviene de ${character.location.name} y aparece en ${character.episode.length} registros de aventuras.`,
  );
  const details = createElement("dl", {},
    createDefinition("Origen", character.origin.name),
    createDefinition("Ubicación actual", character.location.name),
    createDefinition("Género", character.gender),
  );
  const episodeHistory = createElement("div", { className: "episode-history" },
    createElement("span", { text: "Primeros registros en la serie" }),
    history,
  );
  return createElement("article", { className: "story-card" }, profile, story, details, episodeHistory);
}

export function createRelatedResident(character: Character, index: number): HTMLButtonElement {
  const image = createImage(character.image);
  image.loading = "lazy";
  return createElement("button", {
    className: `related-resident${index >= 12 ? " relation-extra" : ""}`,
    attrs: { type: "button", "aria-label": `Ver información de ${character.name}` },
    dataset: { characterId: character.id },
  },
    createElement("div", { className: "resident-portrait" },
      createElement("span", { text: "◎", attrs: { "aria-hidden": "true" } }),
      image,
    ),
    createElement("div", { className: "resident-copy" },
      createStatus(character.status),
      createElement("h3", { text: character.name }),
      createElement("p", { text: characterDescription(character) }),
    ),
    createElement("strong", {}, character.episode.length, createElement("small", { text: "episodios" })),
  );
}

export function createRelatedEpisode(episode: Episode, residentIds: Set<number>, index: number): HTMLButtonElement {
  const relatedResidents = episode.characters.map(getIdFromUrl).filter((id) => residentIds.has(id)).length;
  return createElement("button", {
    className: `related-episode${index >= 12 ? " relation-extra" : ""}`,
    attrs: { type: "button", "aria-label": `Ver información del capítulo ${episode.name}` },
    dataset: { episodeId: episode.id },
  },
    createElement("span", { text: episode.episode }),
    createElement("div", {}, createElement("h3", { text: episode.name }), createElement("p", { text: episode.air_date })),
    createElement("strong", {}, relatedResidents, createElement("small", { text: `residente${relatedResidents === 1 ? "" : "s"}` })),
  );
}

// Contenido intercambiable del dialog de detalles.
export function createCharacterModal(character: Character, episodeMap: Map<number, Episode>): DocumentFragment {
  const episodes = character.episode.map(getIdFromUrl).map((id) => episodeMap.get(id)).filter((item): item is Episode => Boolean(item));
  const portraitImage = createImage(character.image, `Retrato de ${character.name}`);
  const fragment = createFragment(
    createElement("div", { className: "modal-character-hero" },
      createElement("div", { className: "modal-portrait" },
        createElement("span", { text: "◎", attrs: { "aria-hidden": "true" } }),
        portraitImage,
      ),
      createElement("div", {},
        createStatus(character.status),
        createElement("p", { className: "modal-kicker", text: "ARCHIVO DE PERSONAJE" }),
        createElement("h2", { id: "modal-title", text: character.name }),
        createElement("p", { text: characterDescription(character) }),
      ),
    ),
    createElement("dl", { className: "modal-data" },
      createDefinition("Origen", character.origin.name),
      createDefinition("Ubicación actual", character.location.name),
      createDefinition("Género", character.gender),
      createDefinition("Episodios", character.episode.length),
    ),
  );

  const list = createElement("div");
  if (episodes.length) {
    episodes.slice(0, 8).forEach((episode) => list.append(createElement("article", {},
      createElement("b", { text: episode.episode }),
      createElement("span", { text: episode.name }),
      createElement("small", { text: episode.air_date }),
    )));
  } else {
    list.append(createElement("p", { text: "No se recuperaron detalles de sus episodios." }));
  }
  const related = createElement("div", { className: "modal-related-list" },
    createElement("span", { text: "CAPÍTULOS REGISTRADOS" }),
    list,
  );
  if (episodes.length > 8) related.append(createElement("small", { text: `+ ${episodes.length - 8} capítulos adicionales` }));
  fragment.append(related);
  return fragment;
}

export function createEpisodeModal(episode: Episode, residents: Character[]): DocumentFragment {
  const participantIds = new Set(episode.characters.map(getIdFromUrl));
  const relatedResidents = residents.filter((resident) => participantIds.has(resident.id));
  const fragment = createFragment(
    createElement("div", { className: "modal-episode-hero" },
      createElement("span", { text: episode.episode }),
      createElement("p", { className: "modal-kicker", text: "ARCHIVO DE CAPÍTULO" }),
      createElement("h2", { id: "modal-title", text: episode.name }),
      createElement("p", { text: `Emitido el ${episode.air_date}` }),
    ),
    createElement("dl", { className: "modal-data episode-data" },
      createDefinition("Código", episode.episode),
      createDefinition("Personajes totales", episode.characters.length),
      createDefinition("Residentes relacionados", relatedResidents.length),
    ),
  );
  const cards = createElement("div", { className: "modal-residents" });
  if (relatedResidents.length) {
    relatedResidents.forEach((resident) => {
      const image = createImage(resident.image);
      image.loading = "lazy";
      cards.append(createElement("article", {},
        createElement("div", {}, createElement("span", { text: "◎", attrs: { "aria-hidden": "true" } }), image),
        createElement("b", { text: resident.name }),
        createElement("small", { text: resident.species }),
      ));
    });
  } else {
    cards.append(createElement("p", { text: "No aparecen residentes del destino en este capítulo." }));
  }
  fragment.append(createElement("div", { className: "modal-related-list" },
    createElement("span", { text: "RESIDENTES DEL DESTINO EN ESTE CAPÍTULO" }),
    cards,
  ));
  return fragment;
}

function createMissionItem(label: string, value: string, valueClass = ""): HTMLDivElement {
  return createElement("div", {}, createElement("span", { text: label }), createElement("b", { className: valueClass, text: value }));
}

function createTimelineStep(number: string, phase: string, title: string, copy: string): HTMLElement {
  return createElement("article", {},
    createElement("span", { text: number }),
    createElement("div", {},
      createElement("small", { text: phase }),
      createElement("h3", { text: title }),
      createElement("p", { text: copy }),
    ),
  );
}

function createRelationsBlock(
  kind: RelationKind,
  title: string,
  description: Node,
  grid: HTMLElement,
  total: number,
): HTMLDivElement {
  const block = createElement("div", { className: "relation-block", dataset: { relation: kind } },
    createElement("div", { className: "relation-title" },
      createElement("div", {}, createElement("span", { text: kind === "residents" ? "01" : "02" }), createElement("h3", { text: title })),
      createElement("p", {}, description),
    ),
    grid,
  );
  if (total > 12) block.append(createElement("button", {
    className: "relation-toggle",
    text: `Mostrar los ${total} ${kind === "episodes" ? "capítulos" : "personajes"} ↓`,
    attrs: { type: "button" },
    dataset: { expandRelation: kind, total },
  }));
  return block;
}

// Datos ya resueltos que necesita la vista; este builder no realiza peticiones.
export interface JourneyViewData {
  reservation: Reservation;
  destination: Location;
  characters: Character[];
  residents: Character[];
  episodes: Episode[];
  relatedEpisodes: Episode[];
  date: string;
  teamNames: string;
  formattedTotal: string;
}

// Ensambla la segunda etapa completa del viaje como un único fragmento DOM.
export function createJourneyView(data: JourneyViewData): DocumentFragment {
  const { reservation, destination, characters, residents, episodes, relatedEpisodes } = data;
  const fragment = createFragment();
  const episodeMap = new Map(episodes.map((episode) => [episode.id, episode]));
  const residentIds = new Set(residents.map((resident) => resident.id));

  const collage = createElement("div", {
    className: "destination-collage",
    attrs: { "aria-label": `Residentes conocidos de ${destination.name}` },
  });
  if (residents.length) {
    residents.slice(0, 5).forEach((resident, index) => collage.append(createImage(resident.image, resident.name, `collage-${index + 1}`)));
  } else {
    collage.append(createElement("div", { className: "uncharted-destination" }, "◎", createElement("span", { text: "Territorio sin residentes conocidos" })));
  }
  collage.append(createElement("span", { className: "destination-label" },
    createElement("b", { text: destination.type }),
    `${destination.residents.length} residentes registrados`,
  ));

  fragment.append(
    createElement("section", { className: "journey-hero" },
      createElement("div", { className: "journey-hero-copy" },
        createElement("span", { className: "journey-code", text: `EXPEDICIÓN ${reservation.number}` }),
        createElement("h1", {}, "Rumbo a ", createElement("em", { text: reservation.destination.name })),
        createElement("p", { text: `${reservation.passengerName}, el portal está listo. Viajarás con ${data.teamNames} hacia ${destination.dimension}.` }),
        createElement("div", { className: "journey-actions" },
          createElement("a", { text: "Abrir bitácora ↓", attrs: { href: "#bitacora" } }),
          createElement("span", { text: data.date }),
        ),
      ),
      collage,
    ),
    createElement("section", { className: "mission-strip", attrs: { "aria-label": "Resumen de la misión" } },
      createMissionItem("Origen", reservation.origin.name),
      createElement("i", { text: "→" }),
      createMissionItem("Destino", destination.name),
      createMissionItem("Dimensión", destination.dimension),
      createMissionItem("Riesgo", reservation.quote.risk, `mission-risk ${reservation.quote.risk.toLowerCase()}`),
      createMissionItem("Inversión", data.formattedTotal),
    ),
  );

  const travelLog = createElement("section", { className: "travel-log", id: "bitacora" },
    createLogHeading("BITÁCORA EN VIVO", "La historia de tu expedición", "Los datos de personajes y episodios se consultaron al abrir este portal."),
    createElement("div", { className: "timeline" },
      createTimelineStep("01", "Preparación", `Despegue desde ${reservation.origin.name}`, `Tu grupo cruza el control interdimensional con ${reservation.passengers} pasajero${reservation.passengers === 1 ? "" : "s"} y un plan ${reservation.tripType}.`),
      createTimelineStep("02", "Cruce de portal", `Entrada a ${destination.dimension}`, `${destination.name} está clasificado como ${destination.type}. La agencia registra un nivel de riesgo ${reservation.quote.risk.toLowerCase()} para esta coordenada.`),
      createTimelineStep("03", "Encuentro", destination.residents.length ? `${destination.residents.length} señales residentes detectadas` : "Silencio total en el destino", destination.residents.length ? "Los retratos de la zona fueron recuperados desde el catálogo de residentes de la ubicación." : "No existen residentes registrados; el seguro y los protocolos de retorno permanecen activos."),
    ),
  );
  fragment.append(travelLog);

  const residentsGrid = createElement("div", { className: "related-residents-grid" });
  if (residents.length) residents.forEach((resident, index) => residentsGrid.append(createRelatedResident(resident, index)));
  else residentsGrid.append(createElement("div", { className: "relation-empty", text: "No existen residentes registrados para este destino." }));
  const episodesGrid = createElement("div", { className: "related-episodes-grid" });
  if (relatedEpisodes.length) relatedEpisodes.forEach((episode, index) => episodesGrid.append(createRelatedEpisode(episode, residentIds, index)));
  else episodesGrid.append(createElement("div", { className: "relation-empty", text: "No se encontraron capítulos relacionados." }));

  const relationDescription = document.createDocumentFragment();
  relationDescription.append("Usuarios vinculados directamente por ", createElement("code", { text: "location.residents" }));
  fragment.append(createElement("section", { className: "destination-relations", id: "datos-destino" },
    createElement("div", { className: "relations-heading" },
      createLogHeading("CONEXIONES DEL DESTINO", "Personajes y capítulos relacionados", `La relación se obtiene siguiendo los residentes de ${destination.name} y los episodios de cada personaje.`),
      createElement("div", { className: "relations-stats" },
        createElement("div", {}, createElement("b", { text: residents.length }), createElement("span", { text: "personajes" })),
        createElement("div", {}, createElement("b", { text: relatedEpisodes.length }), createElement("span", { text: "capítulos" })),
      ),
    ),
    createRelationsBlock("residents", "Personajes residentes", relationDescription, residentsGrid, residents.length),
    createRelationsBlock("episodes", "Capítulos conectados", document.createTextNode("Episodios donde aparece al menos un residente del destino"), episodesGrid, relatedEpisodes.length),
  ));

  const storyGrid = createElement("div", { className: "story-grid" });
  if (characters.length) characters.forEach((character) => storyGrid.append(createCharacterStory(character, episodeMap)));
  else storyGrid.append(createElement("div", { className: "journey-empty" },
    createElement("b", { text: "Esta expedición viaja sin personajes" }),
    createElement("p", { text: "Puedes volver y crear otra reserva seleccionando hasta tres acompañantes vivos." }),
    createElement("a", { text: "Crear otra reserva", attrs: { href: "/#reserva" } }),
  ));
  fragment.append(
    createElement("section", { className: "crew-section" },
      createLogHeading("ARCHIVO DE PERSONAJES", "Conoce a tu equipo", "Origen, ubicación actual y aventuras registradas por la API."),
      storyGrid,
    ),
    createElement("section", { className: "journey-finale" },
      createElement("span", { text: "PORTAL ESTABLE" }),
      createElement("h2", { text: "Tu historia ya está en marcha." }),
      createElement("p", { text: "La reserva cambió a “En curso” y seguirá disponible en este dispositivo." }),
      createElement("a", { text: "Volver a la agencia →", attrs: { href: "/" } }),
    ),
  );
  return fragment;
}

export function createJourneyError(error: ApiErrorView | string): DocumentFragment {
  const isApiError = typeof error !== "string";
  const title = isApiError ? error.title : "El portal no pudo abrirse";
  const message = isApiError ? error.message : error;
  const content = createElement(
    "div",
    { className: "grid max-w-[520px] justify-items-center text-center" },
    createElement("div", {
      className: "loading-error font-mono !text-[20px] font-black",
      text: isApiError ? String(error.status ?? "OFF") : "!",
    }),
    isApiError && createElement("span", {
      className: "rounded-full border border-[#f38c75]/30 bg-[#f38c75]/10 px-3 py-1 font-mono text-[9px] font-bold tracking-[.12em] text-[#f38c75]",
      text: `CÓDIGO · ${error.code}`,
    }),
    createElement("h1", { text: title }),
    createElement("p", { text: message }),
    isApiError && createElement("small", {
      className: "mt-2 text-[10px] leading-relaxed text-[#748178]",
      text: error.hint,
    }),
  );

  const actions = createElement("div", { className: "mt-5 flex flex-wrap justify-center gap-2.5" });
  if (isApiError && error.canRetry) actions.append(createElement("button", {
    className: "cursor-pointer rounded-full border-0 bg-[var(--green)] px-4 py-2.5 text-[10px] font-extrabold text-[var(--night)]",
    text: "Reintentar salto",
    attrs: { type: "button" },
    dataset: { retryJourney: "true" },
  }));
  actions.append(createElement("a", {
    className: "journey-error-link !m-0",
    text: "Volver a mis reservas",
    attrs: { href: "/" },
  }));
  content.append(actions);
  return createFragment(content);
}

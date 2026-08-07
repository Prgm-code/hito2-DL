import { type Reservation, ReservationStatus, type RiskLevel } from 'models/reservation';
import type { Character, Location } from 'models/rick-and-morty';
import { createElement, createImage, createSvg } from 'ui/dom';

export type ToastKind = 'success' | 'neutral';

const LOCATION_GLYPHS = ['◉', '◎', '◌', '◍'] as const;

function riskClassName(risk: RiskLevel): string {
  return `risk ${risk.toLowerCase()}`;
}

// Elementos del catálogo de destinos.
function createRiskElement(risk: RiskLevel): HTMLSpanElement {
  return createElement('span', { className: riskClassName(risk) }, createElement('i'), risk);
}

function createDestinationArtwork(location: Location, residents: Character[]): HTMLDivElement {
  const coordinate = createElement('span', {
    className: 'coordinate',
    text: `${String(location.id).padStart(3, '0')} · RM`,
  });

  if (residents.length) {
    const artwork = createElement('div', {
      className: `destination-art destination-photos photos-${Math.min(3, residents.length)}`,
    });
    artwork.append(
      createElement('span', {
        className: 'photo-fallback',
        text: '◎',
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    residents.slice(0, 3).forEach((resident) => {
      const image = createImage(resident.image);
      image.title = `${resident.name}, residente de ${location.name}`;
      artwork.append(image);
    });
    artwork.append(
      createElement('span', { className: 'photo-shade' }),
      createElement('span', { className: 'photo-label', text: 'Vista de residentes' }),
      coordinate,
    );
    return artwork;
  }

  const variant = location.id % 4;
  const artwork = createElement('div', { className: `destination-art art-${variant}` });
  artwork.style.setProperty('--location-seed', String(location.id));
  artwork.append(
    createElement('span', { className: 'star-field' }),
    createElement('span', { className: 'location-orb', text: LOCATION_GLYPHS[variant] }),
    coordinate,
  );
  return artwork;
}

export function createSkeletonCard(): HTMLElement {
  return createElement(
    'article',
    { className: 'destination-card skeleton-card' },
    createElement('div'),
    createElement('span'),
    createElement('span'),
  );
}

export function createEmptyState(title: string, message: string, compact = false): HTMLDivElement {
  const messageElement = compact
    ? createElement('span', { text: message })
    : createElement('p', { text: message });
  return createElement(
    'div',
    { className: `empty-state${compact ? ' compact' : ''}` },
    !compact && createElement('span', { className: 'empty-orbit', text: '◎' }),
    createElement('b', { text: title }),
    messageElement,
  );
}

export function createDestinationCard(
  location: Location,
  residents: Character[],
  risk: RiskLevel,
): HTMLElement {
  const chooseButton = createElement(
    'button',
    {
      text: 'Elegir destino ',
      attrs: { type: 'button' },
      dataset: { bookLocation: location.id },
    },
    createElement('span', { text: '→' }),
  );
  const dimension = createElement(
    'p',
    { className: 'dimension' },
    createSvg('0 0 24 24', [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18',
    ]),
    location.dimension,
  );
  const content = createElement(
    'div',
    { className: 'card-content' },
    createElement(
      'div',
      { className: 'card-topline' },
      createElement('span', { text: location.type || 'Desconocido' }),
      createRiskElement(risk),
    ),
    createElement('h3', { text: location.name }),
    dimension,
    createElement(
      'div',
      { className: 'card-footer' },
      createElement(
        'span',
        {},
        createElement('b', { text: location.residents.length }),
        ' residentes',
      ),
      chooseButton,
    ),
  );
  return createElement(
    'article',
    { className: 'destination-card' },
    createDestinationArtwork(location, residents),
    content,
  );
}

// Elementos interactivos del formulario de reserva.
export function createCompanionCard(character: Character, checked: boolean): HTMLLabelElement {
  const input = createElement('input');
  input.type = 'checkbox';
  input.name = 'companionIds';
  input.value = String(character.id);
  input.checked = checked;
  const image = createImage(character.image);
  return createElement(
    'label',
    { className: `companion-card${checked ? ' selected' : ''}` },
    input,
    image,
    createElement(
      'span',
      {},
      createElement('b', { text: character.name }),
      createElement('small', {}, createElement('i'), character.species),
    ),
    createElement('strong', { text: checked ? '✓' : '+', attrs: { 'aria-hidden': 'true' } }),
  );
}

// Elementos de reservas y retroalimentación del formulario.
export function createReservationItem(
  reservation: Reservation,
  companions: Reservation['companions'],
  formattedDate: string,
  formattedTotal: string,
): HTMLElement {
  const route = createElement(
    'div',
    { className: 'reservation-route' },
    createElement('span', { text: reservation.destination.name }),
  );
  const meta = createElement(
    'div',
    { className: 'reservation-meta' },
    createElement('span', { text: reservation.number }),
    createElement('span', { text: formattedDate }),
    createElement('span', {
      text: `${reservation.passengers} pasajero${reservation.passengers === 1 ? '' : 's'}`,
    }),
  );
  const team = createElement('div', { className: 'reservation-team' });
  if (companions.length) {
    companions.forEach((character) => {
      const image = createImage(character.image, character.name);
      image.title = character.name;
      team.append(image);
    });
  } else {
    team.append(createElement('span', { text: 'Viaje sin equipo' }));
  }

  const side = createElement(
    'div',
    { className: 'reservation-side' },
    createElement('span', {
      className: `status ${reservation.status.toLowerCase().replace(' ', '-')}`,
      text: reservation.status,
    }),
    createElement('strong', { text: formattedTotal }),
  );
  if (
    reservation.status === ReservationStatus.CONFIRMED ||
    reservation.status === ReservationStatus.IN_PROGRESS
  ) {
    side.append(
      createElement('a', {
        className: 'start-trip',
        text: `${reservation.status === ReservationStatus.IN_PROGRESS ? 'Continuar viaje' : 'Iniciar viaje'} →`,
        attrs: { href: `/viaje?id=${encodeURIComponent(reservation.id)}` },
      }),
      createElement('button', {
        text: 'Cancelar',
        attrs: { type: 'button' },
        dataset: { cancelReservation: reservation.id },
      }),
    );
  } else if (reservation.status === ReservationStatus.COMPLETED) {
    side.append(
      createElement('a', {
        className: 'start-trip completed-trip',
        text: 'Ver viaje →',
        attrs: { href: `/viaje?id=${encodeURIComponent(reservation.id)}` },
      }),
    );
  }
  return createElement('article', { className: 'reservation-item' }, route, meta, team, side);
}

export function createToast(message: string, kind: ToastKind): HTMLDivElement {
  return createElement(
    'div',
    { className: `toast ${kind}` },
    createElement('span', { text: kind === 'success' ? '✓' : 'i' }),
    message,
  );
}

export function setRiskContent(target: HTMLElement, risk: RiskLevel): void {
  target.className = riskClassName(risk);
  target.replaceChildren(createElement('i'), document.createTextNode(` ${risk}`));
}

export function appendDestinationHint(target: HTMLElement, location: Location): void {
  const route = createElement(
    'span',
    {},
    createElement('b', { text: location.type }),
    ` · ${location.dimension}`,
  );
  target.replaceChildren(
    route,
    createElement('span', { text: `${location.residents.length} residentes` }),
  );
}

export function appendFormErrors(target: HTMLElement, errors: string[]): void {
  const list = createElement('ul');
  errors.forEach((error) => {
    list.append(createElement('li', { text: error }));
  });
  target.replaceChildren(createElement('b', { text: 'Revisa estos datos:' }), list);
}

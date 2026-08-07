import type { TripType } from 'models/reservation';
import { type Quote, type ReservationDraft, RiskLevel } from 'models/reservation';
import { type Character, CharacterStatus, type Location } from 'models/rick-and-morty';

const BASE_PRICE = 1200;
const INSURANCE_PRICE = 190;

const tripMultipliers: Record<TripType, number> = {
  express: 1,
  exploration: 1.3,
  premium: 1.65,
};

export function requiresInsurance(location?: Location): boolean {
  return location?.dimension.toLowerCase() === 'unknown';
}

function getRiskLevel(location?: Location): Quote['risk'] {
  if (!location || location.residents.length === 0) return RiskLevel.HIGH;
  if (requiresInsurance(location) || location.residents.length < 5) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

export function calculateQuote(
  draft: Pick<ReservationDraft, 'passengers' | 'tripType' | 'insurance'>,
  destination?: Location,
): Quote {
  const passengerCount = Math.max(1, draft.passengers || 1);
  const normalizedType = destination?.type.toLowerCase() ?? '';
  const locationRate =
    normalizedType.includes('space station') || normalizedType.includes('station') ? 0.25 : 0;
  const passengerSurcharge = BASE_PRICE * 0.18 * Math.max(0, passengerCount - 1);
  const tripSurcharge = BASE_PRICE * (tripMultipliers[draft.tripType] - 1);
  const locationSurcharge = BASE_PRICE * locationRate;
  const insuranceCost = draft.insurance ? INSURANCE_PRICE * passengerCount : 0;

  return {
    basePrice: BASE_PRICE,
    locationSurcharge,
    passengerSurcharge,
    tripSurcharge,
    insuranceCost,
    total: BASE_PRICE + locationSurcharge + passengerSurcharge + tripSurcharge + insuranceCost,
    risk: getRiskLevel(destination),
  };
}

// Reglas evaluadas antes de guardar una reserva.
export function validateReservation(
  draft: ReservationDraft,
  destination: Location | undefined,
  companions: Character[],
): string[] {
  const errors: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travelDate = new Date(`${draft.travelDate}T00:00:00`);

  if (draft.passengerName.trim().length < 3)
    errors.push('Ingresa el nombre completo del pasajero.');
  if (!/^\S+@\S+\.\S+$/.test(draft.email)) errors.push('Ingresa un correo electrónico válido.');
  if (!draft.destinationId) errors.push('Selecciona un destino.');
  if (!draft.travelDate || Number.isNaN(travelDate.getTime()) || travelDate <= today) {
    errors.push('La fecha del viaje debe ser futura.');
  }
  if (draft.passengers < 1 || draft.passengers > 8)
    errors.push('La reserva admite entre 1 y 8 pasajeros.');
  if (draft.companionIds.length > 3) errors.push('Puedes viajar con un máximo de tres personajes.');
  if (companions.some((companion) => companion.status !== CharacterStatus.ALIVE)) {
    errors.push('Todos los personajes seleccionados deben estar vivos.');
  }
  if (requiresInsurance(destination) && !draft.insurance) {
    errors.push('Los destinos de dimensión desconocida exigen seguro interdimensional.');
  }

  return errors;
}

export function formatCredits(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

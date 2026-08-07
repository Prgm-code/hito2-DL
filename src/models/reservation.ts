import type { Character, Location } from 'models/rick-and-morty';

/** Tipos de viaje admitidos por el formulario y el cálculo de tarifa. */
export enum TripType {
  EXPRESS = 'express',
  EXPLORATION = 'exploration',
  PREMIUM = 'premium',
}

/** Niveles de riesgo visibles en la cotización. */
export enum RiskLevel {
  LOW = 'Bajo',
  MEDIUM = 'Medio',
  HIGH = 'Alto',
}

/** Estados permitidos durante el ciclo de vida de una reserva. */
export enum ReservationStatus {
  CONFIRMED = 'Confirmada',
  IN_PROGRESS = 'En curso',
  COMPLETED = 'Completada',
  CANCELLED = 'Cancelada',
}

/** Paneles principales que puede mostrar la interfaz. */
export enum PlannerView {
  DESTINATIONS = 'destinations',
  RESERVATIONS = 'reservations',
}

export interface ReservationDraft {
  passengerName: string;
  email: string;
  destinationId: number;
  travelDate: string;
  passengers: number;
  companionIds: number[];
  tripType: TripType;
  insurance: boolean;
  comments: string;
}

export interface Quote {
  basePrice: number;
  locationSurcharge: number;
  passengerSurcharge: number;
  tripSurcharge: number;
  insuranceCost: number;
  total: number;
  risk: RiskLevel;
}

export interface Reservation extends ReservationDraft {
  id: string;
  number: string;
  status: ReservationStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  destination: Pick<Location, 'id' | 'name' | 'dimension' | 'type'>;
  companions: Pick<Character, 'id' | 'name' | 'image' | 'species' | 'status'>[];
  /** Compatibilidad con reservas creadas antes de permitir varios personajes. */
  companion?: Pick<Character, 'id' | 'name' | 'image' | 'species' | 'status'> | null;
  companionId?: number | null;
  quote: Quote;
}

import type { Character, Location } from "./rick-and-morty";

export type TripType = "express" | "exploration" | "premium";
export type RiskLevel = "Bajo" | "Medio" | "Alto";
export type ReservationStatus = "Confirmada" | "En curso" | "Completada" | "Cancelada";

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
  destination: Pick<Location, "id" | "name" | "dimension" | "type">;
  companions: Pick<Character, "id" | "name" | "image" | "species" | "status">[];
  /** Compatibilidad con reservas creadas antes de permitir varios personajes. */
  companion?: Pick<Character, "id" | "name" | "image" | "species" | "status"> | null;
  companionId?: number | null;
  quote: Quote;
}

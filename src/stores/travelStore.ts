import {
  PlannerView,
  type Reservation,
  type ReservationDraft,
  ReservationStatus,
  TripType,
} from 'models/reservation';
import type { Character, Location } from 'models/rick-and-morty';
import type { ApiErrorView } from 'services/rickAndMortyApiError';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

const initialDraft: ReservationDraft = {
  passengerName: '',
  email: '',
  destinationId: 0,
  travelDate: '',
  passengers: 1,
  companionIds: [],
  tripType: TripType.EXPRESS,
  insurance: false,
  comments: '',
};

interface TravelState {
  locations: Location[];
  companions: Character[];
  reservations: Reservation[];
  draft: ReservationDraft;
  activeView: PlannerView;
  locationsPage: number;
  totalLocationPages: number;
  search: string;
  typeFilter: string;
  loading: boolean;
  error: ApiErrorView | null;
  setCatalog: (locations: Location[], page: number, pages: number) => void;
  setCompanions: (companions: Character[]) => void;
  setDraft: (patch: Partial<ReservationDraft>) => void;
  setView: (view: TravelState['activeView']) => void;
  setFilters: (search: string, typeFilter: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: ApiErrorView | null) => void;
  addReservation: (reservation: Reservation) => void;
  cancelReservation: (id: string) => void;
  startReservation: (id: string) => void;
  completeReservation: (id: string) => void;
  resetDraft: () => void;
}

// Zustand controla la hidratación, pero el valor físico conserva el contrato
// pedido: localStorage["reservas"] es directamente un arreglo JSON.
const reservationsStorage: StateStorage = {
  getItem: (name) => {
    const saved = localStorage.getItem(name);
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved) as unknown;
      const reservations = Array.isArray(parsed)
        ? parsed
        : ((parsed as { state?: { reservations?: Reservation[] } })?.state?.reservations ?? []);
      return JSON.stringify({ state: { reservations }, version: 0 });
    } catch {
      return JSON.stringify({ state: { reservations: [] }, version: 0 });
    }
  },
  setItem: (name, value) => {
    const persisted = JSON.parse(value) as { state?: { reservations?: Reservation[] } };
    localStorage.setItem(name, JSON.stringify(persisted.state?.reservations ?? []));
  },
  removeItem: (name) => localStorage.removeItem(name),
};

export const travelStore = createStore<TravelState>()(
  persist<TravelState, [], [], Pick<TravelState, 'reservations'>>(
    (set) => ({
      locations: [],
      companions: [],
      reservations: [],
      draft: { ...initialDraft },
      activeView: PlannerView.DESTINATIONS,
      locationsPage: 1,
      totalLocationPages: 1,
      search: '',
      typeFilter: 'all',
      loading: false,
      error: null,
      setCatalog: (locations, page, pages) =>
        set({ locations, locationsPage: page, totalLocationPages: pages }),
      setCompanions: (companions) => set({ companions }),
      setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      setView: (activeView) => set({ activeView }),
      setFilters: (search, typeFilter) => set({ search, typeFilter }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      addReservation: (reservation) =>
        set((state) => ({ reservations: [reservation, ...state.reservations] })),
      cancelReservation: (id) =>
        set((state) => ({
          reservations: state.reservations.map((reservation) =>
            reservation.id === id && reservation.status !== ReservationStatus.COMPLETED
              ? { ...reservation, status: ReservationStatus.CANCELLED }
              : reservation,
          ),
        })),
      startReservation: (id) =>
        set((state) => ({
          reservations: state.reservations.map((reservation) =>
            reservation.id === id && reservation.status === ReservationStatus.CONFIRMED
              ? {
                  ...reservation,
                  status: ReservationStatus.IN_PROGRESS,
                  startedAt: new Date().toISOString(),
                }
              : reservation,
          ),
        })),
      completeReservation: (id) =>
        set((state) => ({
          reservations: state.reservations.map((reservation) =>
            reservation.id === id && reservation.status === ReservationStatus.IN_PROGRESS
              ? {
                  ...reservation,
                  status: ReservationStatus.COMPLETED,
                  completedAt: new Date().toISOString(),
                }
              : reservation,
          ),
        })),
      resetDraft: () => set({ draft: { ...initialDraft }, companions: [] }),
    }),
    {
      name: 'reservas',
      storage: createJSONStorage(() => reservationsStorage),
      partialize: (state) => ({ reservations: state.reservations }),
    },
  ),
);

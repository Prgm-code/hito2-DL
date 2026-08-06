import { travelStore } from "../../stores/travelStore";
import type { Reservation } from "../../types/reservation";
import { createElement } from "../../ui/dom";
import { createEmptyState, createReservationItem } from "../../ui/appElements";
import { formatCredits } from "../../utils/travelRules";
import { element } from "./helpers";
import { showToast } from "./notifications";

export type PlannerView = "destinations" | "reservations";

const reservationDateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Compatibilidad con reservas antiguas que guardaban un solo acompañante.
function getReservationCompanions(reservation: Reservation): Reservation["companions"] {
  if (Array.isArray(reservation.companions)) return reservation.companions;
  return reservation.companion ? [reservation.companion] : [];
}

export function renderReservations(): void {
  const { reservations } = travelStore.getState();
  const list = element<HTMLDivElement>("#reservations-list");
  element("#reservation-count").textContent = String(reservations.length);

  if (!reservations.length) {
    const emptyState = createEmptyState(
      "Aún no hay viajes en tu bitácora",
      "Elige un destino del catálogo y confirma tu primera reserva interdimensional.",
    );
    emptyState.append(createElement("button", {
      text: "Explorar destinos",
      attrs: { type: "button" },
      dataset: { goDestinations: "" },
    }));
    list.replaceChildren(emptyState);
  } else {
    list.replaceChildren(...reservations.map((reservation) => {
      const formattedDate = reservationDateFormatter.format(new Date(`${reservation.travelDate}T12:00:00`));
      return createReservationItem(
        reservation,
        getReservationCompanions(reservation),
        formattedDate,
        formatCredits(reservation.quote.total),
      );
    }));
  }

  list.querySelector<HTMLButtonElement>("[data-go-destinations]")
    ?.addEventListener("click", () => setActiveView("destinations"));
  list.querySelectorAll<HTMLButtonElement>("[data-cancel-reservation]").forEach((button) => {
    button.addEventListener("click", () => {
      travelStore.getState().cancelReservation(button.dataset.cancelReservation ?? "");
      renderReservations();
      showToast("Reserva cancelada", "neutral");
    });
  });
}

// Mantiene sincronizados store, panel visible, pestañas ARIA y contenido de reservas.
export function setActiveView(view: PlannerView): void {
  travelStore.getState().setView(view);
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  if (view === "reservations") renderReservations();
}

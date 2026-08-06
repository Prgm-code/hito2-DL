import { createToast, type ToastKind } from "../../ui/appElements";
import { element } from "./helpers";

// Las notificaciones son temporales y no forman parte del estado persistente.
export function showToast(message: string, kind: ToastKind = "success"): void {
  const toast = createToast(message, kind);
  element("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

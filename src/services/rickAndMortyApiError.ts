/** Categorías que la interfaz usa para presentar cada anomalía. */
export type ApiErrorKind =
  | "bad-request"
  | "forbidden"
  | "not-found"
  | "timeout"
  | "rate-limit"
  | "server"
  | "network"
  | "unknown";

/** Información segura y temática que puede mostrarse directamente en la UI. */
export interface ApiErrorView {
  kind: ApiErrorKind;
  code: string;
  status?: number;
  title: string;
  message: string;
  hint: string;
  canRetry: boolean;
}

/** Error tipado producido al consultar Rick and Morty API. */
export class RickAndMortyApiError extends Error {
  /**
   * @param message Mensaje entendible que puede mostrarse en la interfaz.
   * @param status Código HTTP, cuando el servidor alcanzó a responder.
   * @param originalError Error original de red o de lectura del JSON.
   */
  constructor(
    message: string,
    public readonly status?: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "RickAndMortyApiError";
  }
}

/**
 * Convierte cualquier valor capturado por `catch` en un error estable.
 *
 * @param error Valor desconocido recibido por el bloque `catch`.
 * @returns Error normalizado de Rick and Morty API.
 */
export function normalizeRickAndMortyError(error: unknown): RickAndMortyApiError {
  if (error instanceof RickAndMortyApiError) return error;

  if (error instanceof TypeError) {
    return new RickAndMortyApiError(
      "No fue posible conectar con Rick and Morty API.",
      undefined,
      error,
    );
  }

  const message = error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado al consultar la API.";
  return new RickAndMortyApiError(message, undefined, error);
}

/**
 * Traduce un error técnico a una respuesta temática para la interfaz.
 *
 * @param error Error técnico, HTTP o de red.
 * @returns Título, explicación, ayuda y código listos para renderizar.
 */
export function getRickAndMortyErrorView(error: unknown): ApiErrorView {
  const apiError = normalizeRickAndMortyError(error);
  const status = apiError.status;

  if (status === 400) return {
    kind: "bad-request",
    code: "HTTP 400",
    status,
    title: "Coordenadas interdimensionales corruptas",
    message: "El arma de portales rechazó los parámetros enviados.",
    hint: "Revisa los filtros o vuelve a las coordenadas iniciales.",
    canRetry: true,
  };

  if (status === 401 || status === 403) return {
    kind: "forbidden",
    code: `HTTP ${status}`,
    status,
    title: "Acceso bloqueado por la Ciudadela",
    message: "El Consejo de Ricks no autorizó el ingreso a este sector.",
    hint: "Regresa a la agencia o intenta abrir otro portal.",
    canRetry: false,
  };

  if (status === 404) return {
    kind: "not-found",
    code: "HTTP 404",
    status,
    title: "Dimensión perdida",
    message: "La dimensión solicitada desapareció del mapa multiversal o nunca existió.",
    hint: "Prueba otro nombre, tipo de destino o página del catálogo.",
    canRetry: true,
  };

  if (status === 408) return {
    kind: "timeout",
    code: "HTTP 408",
    status,
    title: "El portal agotó su tiempo",
    message: "La conexión se cerró antes de recibir las coordenadas completas.",
    hint: "Recalibra el portal e intenta nuevamente.",
    canRetry: true,
  };

  if (status === 429) return {
    kind: "rate-limit",
    code: "HTTP 429",
    status,
    title: "Demasiados portales abiertos",
    message: "La red interdimensional está saturada por exceso de saltos.",
    hint: "Espera unos segundos antes de volver a intentarlo.",
    canRetry: true,
  };

  if (status !== undefined && status >= 500) return {
    kind: "server",
    code: `HTTP ${status}`,
    status,
    title: "La Ciudadela está fuera de servicio",
    message: "Los servidores multiversales sufren una anomalía temporal.",
    hint: "Tu reserva está segura. Intenta abrir el portal más tarde.",
    canRetry: true,
  };

  if (status === undefined && apiError.originalError instanceof TypeError) return {
    kind: "network",
    code: "SIN SEÑAL",
    title: "Se perdió la señal interdimensional",
    message: "No logramos contactar con Rick and Morty API.",
    hint: "Comprueba tu conexión y vuelve a calibrar el portal.",
    canRetry: true,
  };

  return {
    kind: "unknown",
    code: status ? `HTTP ${status}` : "ERROR RM-∞",
    status,
    title: "Anomalía multiversal inesperada",
    message: "Algo alteró la trayectoria de la petición.",
    hint: "Intenta nuevamente; si continúa, regresa a la agencia.",
    canRetry: true,
  };
}

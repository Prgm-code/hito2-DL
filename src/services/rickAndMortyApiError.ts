const ERROR_PREVIEW_PARAM = 'apiError';

/** Categorías que la interfaz usa para presentar cada anomalía. */
export type ApiErrorKind =
  | 'not-found'
  | 'timeout'
  | 'rate-limit'
  | 'server'
  | 'network'
  | 'unknown';

/** Información segura y temática que puede mostrarse directamente en la UI. */
export interface ApiErrorView {
  kind: ApiErrorKind;
  code: string;
  status?: number;
  title: string;
  message: string;
  hint: string;
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
    this.name = 'RickAndMortyApiError';
  }
}

/** Simula un error desde `?apiError=404` para revisar la interfaz. */
export function throwPreviewError(): void {
  if (typeof window === 'undefined') return;
  const status = Number(new URLSearchParams(window.location.search).get(ERROR_PREVIEW_PARAM));
  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    throw new RickAndMortyApiError(
      `Error HTTP ${status} simulado para revisar la interfaz.`,
      status,
    );
  }
}

/** Convierte una respuesta HTTP fallida en el error correspondiente. */
export function createRickAndMortyHttpError(response: Response): RickAndMortyApiError {
  return new RickAndMortyApiError(
    `La API respondió con el código ${response.status}`,
    response.status,
  );
}

// Los valores capturados como unknown se convierten a un error estable y tipado.
export function normalizeRickAndMortyError(error: unknown, aborted = false): RickAndMortyApiError {
  if (aborted) {
    return new RickAndMortyApiError('La API no respondió dentro del tiempo esperado.', 408, error);
  }

  if (error instanceof RickAndMortyApiError) return error;

  if (error instanceof TypeError) {
    return new RickAndMortyApiError(
      'No fue posible conectar con Rick and Morty API.',
      undefined,
      error,
    );
  }

  const message =
    error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar la API.';
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

  if (status === 404)
    return {
      kind: 'not-found',
      code: 'HTTP 404',
      status,
      title: 'Dimensión perdida',
      message: 'La dimensión solicitada desapareció del mapa multiversal o nunca existió.',
      hint: 'Prueba otro nombre, tipo de destino o página del catálogo.',
    };

  if (status === 408)
    return {
      kind: 'timeout',
      code: 'HTTP 408',
      status,
      title: 'El portal agotó su tiempo',
      message: 'La conexión se cerró antes de recibir las coordenadas completas.',
      hint: 'Recalibra el portal e intenta nuevamente.',
    };

  if (status === 429)
    return {
      kind: 'rate-limit',
      code: 'HTTP 429',
      status,
      title: 'Demasiados portales abiertos',
      message: 'La red interdimensional está saturada por exceso de saltos.',
      hint: 'Vuelve a intentarlo cuando quieras recalibrar el portal.',
    };

  if (status !== undefined && status >= 500)
    return {
      kind: 'server',
      code: `HTTP ${status}`,
      status,
      title: 'La Ciudadela está fuera de servicio',
      message: 'Los servidores multiversales sufren una anomalía temporal.',
      hint: 'Tu reserva está segura. Intenta abrir el portal más tarde.',
    };

  if (status === undefined && apiError.originalError instanceof TypeError)
    return {
      kind: 'network',
      code: 'SIN SEÑAL',
      title: 'Se perdió la señal interdimensional',
      message: 'No logramos contactar con Rick and Morty API.',
      hint: 'Comprueba tu conexión y vuelve a calibrar el portal.',
    };

  return {
    kind: 'unknown',
    code: status ? `HTTP ${status}` : 'ERROR RM-∞',
    status,
    title: 'Anomalía multiversal inesperada',
    message: 'Algo alteró la trayectoria de la petición.',
    hint: 'Intenta nuevamente; si continúa, regresa a la agencia.',
  };
}

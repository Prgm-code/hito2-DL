# Portal de Turismo Interdimensional

Aplicación web desarrollada con Astro y TypeScript que consume la
[Rick and Morty API](https://rickandmortyapi.com/) para explorar destinos,
seleccionar acompañantes y crear reservas de viajes interdimensionales. Las
reservas se administran con Zustand y se conservan en `localStorage`.

## Cumplimiento de la rúbrica — Hito 2

La siguiente matriz permite localizar rápidamente la implementación de cada
criterio evaluado y las funciones que lo demuestran.

### 1. Modelado de datos en TypeScript


| Evidencia | Archivo | Tipos o funciones principales |
| --- | --- | --- |
| Entidades obtenidas desde la API | [`src/types/rick-and-morty.ts`](src/types/rick-and-morty.ts) | `Character`, `Location`, `Episode`, `ApiInfo` y el genérico `ApiPage<T>` |
| Modelo del dominio de reservas | [`src/types/reservation.ts`](src/types/reservation.ts) | uniones `TripType`, `RiskLevel`, `ReservationStatus`; interfaces `ReservationDraft`, `Quote` y `Reservation` |
| Entradas tipadas para todas las consultas | [`src/types/api-requests.ts`](src/types/api-requests.ts) | `LocationsRequest`, `CharactersRequest`, `EpisodesRequest`, `ResourceByIdRequest`, `ResourcesByIdsRequest` y `ApiRequestControl` |
| Estado global y sus acciones | [`src/stores/travelStore.ts`](src/stores/travelStore.ts) | `TravelState`, `initialDraft`, `setCatalog`, `setDraft`, `setLoading`, `setError`, `addReservation`, `cancelReservation`, `startReservation` y `resetDraft` |
| Errores de API aptos para la interfaz | [`src/services/rickAndMortyApiError.ts`](src/services/rickAndMortyApiError.ts) | `ApiErrorKind`, `ApiErrorView`, `RickAndMortyApiError`, `normalizeRickAndMortyError` y `getRickAndMortyErrorView` |

El proyecto hereda la configuración estricta de Astro en
[`tsconfig.json`](tsconfig.json), por lo que TypeScript comprueba los tipos de
componentes, servicios, estado, controles del formulario y respuestas de la
API. No se utiliza `any`; los errores capturados entran como `unknown` y se
normalizan antes de ser consumidos.

### 2. Manejo del DOM y formularios


| Requisito | Archivo y función | Cómo se implementa |
| --- | --- | --- |
| Captura segura de nodos | [`src/scripts/travel-planner/helpers.ts`](src/scripts/travel-planner/helpers.ts), `element<T>()` | Ejecuta `querySelector<T>()`, comprueba si el nodo existe y lanza un error descriptivo si falta. Así, el resto del código no trabaja con referencias nulas. |
| Creación tipada y segura del DOM | [`src/ui/dom.ts`](src/ui/dom.ts), `createElement()`, `appendChildren()`, `createImage()` y `createSvg()` | El nombre de la etiqueta determina el tipo HTML retornado. El contenido se inserta con `textContent`, `createTextNode` y nodos DOM, sin interpolar datos remotos mediante `innerHTML`. |
| Prevención del envío nativo | [`src/scripts/travel-planner/booking.ts`](src/scripts/travel-planner/booking.ts), `submitReservation()` | Recibe un `SubmitEvent` y ejecuta `event.preventDefault()` antes de procesar la reserva. |
| Extracción y limpieza del payload | [`src/scripts/travel-planner/booking.ts`](src/scripts/travel-planner/booking.ts), `readDraft()` | Usa `FormData`, aplica `trim()` a textos, convierte identificadores y cantidades con `Number`, filtra IDs no numéricos y normaliza checkbox y radio buttons. El resultado cumple `ReservationDraft`. |
| Validación de reglas del formulario | [`src/utils/travelRules.ts`](src/utils/travelRules.ts), `validateReservation()` | Comprueba nombre, correo, origen/destino, fecha futura, rango de pasajeros, máximo de acompañantes, personajes vivos y seguro obligatorio. |
| Errores limpios en pantalla | [`src/scripts/travel-planner/booking.ts`](src/scripts/travel-planner/booking.ts), `showFormErrors()`; [`src/ui/appElements.ts`](src/ui/appElements.ts), `appendFormErrors()` | Presenta todos los mensajes en un bloque con `role="alert"` y construye cada elemento usando texto seguro. |
| Eventos sobre contenido dinámico | [`src/scripts/travel-planner/events.ts`](src/scripts/travel-planner/events.ts), `bindDestinationSelection()` y `bindBookingEvents()` | Emplea delegación de eventos para tarjetas y acompañantes que se reconstruyen dinámicamente. |

Flujo del formulario:

```text
submit
  → preventDefault()
  → readDraft() / limpieza del FormData
  → validateReservation()
  ├─ con errores: showFormErrors()
  └─ válido: crear reserva → guardar en Zustand/localStorage → renderizar
```

Los controles HTML y regiones que participan en este flujo están declarados en
[`src/components/BookingPanel.astro`](src/components/BookingPanel.astro). Las
tarjetas, avisos, reservas y estados vacíos se construyen en
[`src/ui/appElements.ts`](src/ui/appElements.ts).

### 3. Arquitectura asíncrona


| Evidencia | Archivo y funciones | Responsabilidad |
| --- | --- | --- |
| Cliente HTTP reutilizable | [`src/services/rickAndMortyApi.ts`](src/services/rickAndMortyApi.ts), `request<T>()` | Ejecuta `fetch` con `async/await`, timeout mediante `AbortController`, respuesta genérica tipada y ciclo `try/catch/finally`. |
| Consultas de dominio | [`src/services/rickAndMortyApi.ts`](src/services/rickAndMortyApi.ts), `getLocations()`, `getCharacters()`, `getEpisodes()`, `getLocation()`, `getCharactersByIds()` y `getEpisodesByIds()` | Encapsulan endpoints, filtros, parámetros y tipos de retorno de la API. |
| Peticiones paralelas | [`src/scripts/travel-planner/index.ts`](src/scripts/travel-planner/index.ts), `loadInitialData()` | Solicita ubicaciones y personajes simultáneamente mediante `Promise.all`; ante un fallo espera los cierres con `Promise.allSettled`. |
| Catálogo asíncrono | [`src/scripts/travel-planner/catalog.ts`](src/scripts/travel-planner/catalog.ts), `loadCatalog()` y `loadDestinationPreviews()` | Carga páginas y vistas previas con manejo de error y una degradación visual cuando no se pueden obtener imágenes. |
| Dependencias del formulario | [`src/scripts/travel-planner/booking.ts`](src/scripts/travel-planner/booking.ts), `updateCompanions()` | Espera residentes del destino, filtra personajes vivos y aplica un catálogo de respaldo si la petición falla. |
| Estado global de las peticiones | [`src/services/rickAndMortyApi.ts`](src/services/rickAndMortyApi.ts), `startLoading()` y `stopLoading()` | Un contador de peticiones pendientes evita ocultar prematuramente la carga cuando existen consultas paralelas. |
| Carga visible en el DOM | [`src/scripts/travel-planner/catalog.ts`](src/scripts/travel-planner/catalog.ts), `renderCatalog()`; [`src/scripts/travel-planner/booking.ts`](src/scripts/travel-planner/booking.ts), `renderBookingApiState()` | Muestra spinner y tarjetas skeleton, marca el formulario con `aria-busy` y bloquea únicamente los controles que dependen de datos remotos. |
| Error visible y recuperable | [`src/services/rickAndMortyApiError.ts`](src/services/rickAndMortyApiError.ts), `getRickAndMortyErrorView()`; [`src/ui/apiErrorElements.ts`](src/ui/apiErrorElements.ts), `createApiErrorPanel()` y `createApiFormErrorNotice()` | Traduce errores HTTP, timeout y red a mensajes temáticos, accesibles y con acción de reintento cuando corresponde. |

#### Coordinación entre `Promise.all()` y `Promise.allSettled()`

En `loadInitialData()` ambas promesas se crean antes del bloque `try`, por lo
que la consulta de ubicaciones y la de personajes comienzan simultáneamente:

```ts
const requests = [
  getLocations(),
  getCharacters({ page: 1, status: "alive" }),
] as const;
```

Dentro del `try`, `Promise.all(requests)` expresa que los dos resultados son
obligatorios para construir la pantalla inicial. Cuando ambos tienen éxito,
devuelve sus valores en el mismo orden y permite desestructurarlos con sus
tipos correspondientes:

```ts
const [locations, aliveCharacters] = await Promise.all(requests);
```

Si una petición falla, `Promise.all()` rechaza inmediatamente y transfiere el
control al `catch`, aunque la otra petición podría continuar pendiente. Por
eso el `catch` ejecuta `await Promise.allSettled(requests)`: no vuelve a enviar
las consultas, sino que observa las mismas promesas y espera a que ambas hayan
terminado, independientemente de si fueron cumplidas o rechazadas.

Esta espera es necesaria para coordinar el estado visual. Cada llamada a
`request<T>()` incrementa `pendingRequests` mediante `startLoading()` y lo
reduce en su bloque `finally` mediante `stopLoading()`. Esperar todas las
promesas garantiza que se ejecuten ambos `finally` y que `loading` quede en
`false` antes de reemplazar el indicador de carga por el panel de error.

```text
getLocations()  ── startLoading() ── éxito/error ── finally ── stopLoading()
getCharacters() ─ startLoading() ── éxito/error ── finally ── stopLoading()
                        │
               Promise.all() exige ambas
                        │ si una falla
                        ▼
            Promise.allSettled() espera los cierres
                        │
                        ▼
              loading=false → render del error
```

Por tanto, las dos llamadas no son redundantes: `Promise.all()` obtiene el
resultado conjunto o detecta el fallo, mientras `Promise.allSettled()` asegura
la finalización ordenada de todas las operaciones antes de actualizar el DOM.
También sería posible usar solamente `Promise.allSettled()` desde el inicio,
pero habría que comprobar manualmente el `status` de cada resultado antes de
acceder a sus valores.

El store expone `loading` y `error`. El servicio los actualiza y la suscripción
creada por `bindApiState()` en
[`src/scripts/travel-planner/events.ts`](src/scripts/travel-planner/events.ts)
refleja sus cambios inmediatamente en el formulario.

```text
Interfaz → servicio API → loading = true
                         ↓
                 fetch + await + timeout
                    ↙             ↘
              respuesta          error normalizado
                  ↓                     ↓
             actualizar store     error en Zustand
                    ↘             ↙
                finally → loading = false
                         ↓
                  renderizar el DOM
```

## Funcionalidades

- Catálogo paginado con búsqueda, filtro por tipo y datos en tiempo real.
- Imágenes de residentes cargadas como vista previa de cada destino.
- Formulario con origen, destino, fecha, pasajeros, tipo de viaje, seguro y
  hasta tres acompañantes vivos.
- Cálculo automático de precio y nivel de riesgo.
- Reglas especiales para dimensiones desconocidas.
- Creación, visualización, inicio y cancelación de reservas.
- Persistencia de reservas en `localStorage["reservas"]` mediante Zustand.
- Estados de carga, vacío, error y reintento accesibles.
- Ruta `/viaje` para visualizar el itinerario de una reserva.

## Estructura principal

```text
src/
├── components/             Componentes Astro y formulario HTML
├── pages/                  Rutas / y /viaje
├── scripts/
│   └── travel-planner/     Controladores del catálogo, reserva y eventos
├── services/               Cliente y normalización de errores de la API
├── stores/                 Estado global y persistencia con Zustand
├── types/                  Entidades, payloads y contratos TypeScript
├── ui/                     Constructores tipados de elementos DOM
└── utils/                  Validaciones y reglas del negocio
```

## Tecnologías

- Astro 7
- TypeScript en modo estricto
- Tailwind CSS 4
- Zustand 5 con persistencia en `localStorage`
- Rick and Morty API

## Instalación y ejecución

Requisitos: Node.js 22.12 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible normalmente en `http://localhost:4321`.

Otros comandos:

| Comando | Acción |
| --- | --- |
| `pnpm build` | Genera la versión de producción en `dist/`. |
| `pnpm preview` | Sirve localmente la compilación de producción. |
| `pnpm astro check` | Comprueba los componentes Astro y los tipos del proyecto. |

## Verificación de estados de error

Para revisar la respuesta visual sin modificar el endpoint real se puede abrir
la aplicación con el parámetro `apiError`:

```text
http://localhost:4321/?apiError=404
http://localhost:4321/?apiError=408
http://localhost:4321/?apiError=429
http://localhost:4321/?apiError=500
```

Esto activa el mismo flujo de normalización, estado global, bloqueo del
formulario, presentación accesible y reintento utilizado por un error real.

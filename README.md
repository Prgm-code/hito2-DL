# Portal de Turismo Interdimensional

Aplicación demostrativa creada con Astro y TypeScript. Consume la
[Rick and Morty API](https://rickandmortyapi.com/) para explorar destinos,
elegir acompañantes y guardar reservas interdimensionales.

## Cumplimiento de la rúbrica — Hito 2

### 1. Modelado con TypeScript

| Requisito | Evidencia |
| --- | --- |
| Entidades de la API | [`src/types/rick-and-morty.ts`](src/types/rick-and-morty.ts): `Character`, `Location`, `Episode` y `ApiPage<T>` |
| Datos del formulario y reservas | [`src/types/reservation.ts`](src/types/reservation.ts): `ReservationDraft`, `Reservation`, `Quote` y tipos unión |
| Parámetros de consultas | [`src/types/api-requests.ts`](src/types/api-requests.ts): filtros e identificadores tipados |
| Estado global | [`src/stores/travelStore.ts`](src/stores/travelStore.ts): estado y acciones de Zustand |
| Errores | [`src/services/rickAndMortyApiError.ts`](src/services/rickAndMortyApiError.ts): error técnico y modelo seguro para la interfaz |

El proyecto usa la configuración estricta de Astro. Las respuestas, formularios,
controles DOM y errores están tipados; no se utiliza `any`.

### 2. DOM y formulario

| Requisito | Implementación |
| --- | --- |
| Selección segura de elementos | `element<T>()` en [`helpers.ts`](src/scripts/travel-planner/helpers.ts) |
| Creación segura del DOM | `createElement()`, `createImage()` y `createSvg()` en [`dom.ts`](src/ui/dom.ts) |
| Evitar el envío nativo | `event.preventDefault()` en `submitReservation()` |
| Leer y limpiar datos | `FormData`, `trim()`, `Number()` y normalización en `readDraft()` |
| Validar datos | `validateReservation()` en [`travelRules.ts`](src/utils/travelRules.ts) |
| Mostrar errores | Bloque accesible con `role="alert"` y mensajes construidos con `textContent` |
| Contenido dinámico | Delegación de eventos en [`events.ts`](src/scripts/travel-planner/events.ts) |

Flujo principal:

```text
submit
  → preventDefault()
  → readDraft()
  → validateReservation()
  ├─ inválido: mostrar errores
  └─ válido: crear y guardar reserva
```

El usuario elige destino, fecha, cantidad de pasajeros, tipo de viaje, seguro
y hasta tres acompañantes vivos.

### 3. Programación asíncrona

| Requisito | Implementación |
| --- | --- |
| Cliente HTTP reutilizable | `request<T>()` en [`rickAndMortyApi.ts`](src/services/rickAndMortyApi.ts) |
| `async/await` y `try/catch/finally` | Una petición por operación, timeout y error visible |
| Peticiones paralelas | `Promise.all()` carga ubicaciones y personajes al iniciar |
| Consultas por endpoint | `getLocations()`, `getCharacters()`, `getLocation()` y consultas múltiples por IDs |
| Estado de carga | Zustand guarda `loading`; el DOM muestra spinner y skeletons |
| Estado de error | El servicio normaliza el error y la interfaz ofrece un reintento manual |

No existen reintentos automáticos ni caché propia. Cada acción realiza una
petición; si falla, la aplicación muestra el error y deja que el usuario decida
si quiere intentar nuevamente.

### 4. Estado y persistencia

- Zustand mantiene catálogo, formulario, acompañantes, reservas, carga y error.
- Las reservas se guardan en `localStorage["reservas"]`.
- Se pueden crear, listar, iniciar y cancelar reservas.
- La ruta `/viaje` presenta el itinerario de una reserva guardada.

## Funcionalidades

- Catálogo paginado con búsqueda y filtro por tipo.
- Hasta tres imágenes de residentes por destino cuando están disponibles.
- Formulario validado y cálculo automático de precio y riesgo.
- Selección de hasta tres personajes vivos.
- Estados de carga, vacío y error.
- Página 404 personalizada con la temática de Portal Trip.

## Estructura

```text
src/
├── components/   componentes Astro y formulario
├── pages/        rutas de la aplicación
├── scripts/      interacción, catálogo y reservas
├── services/     cliente API y errores
├── stores/       estado global y persistencia
├── types/        contratos TypeScript
├── ui/           constructores de elementos DOM
└── utils/        validaciones y reglas del viaje
```

## Tecnologías

- Astro 7
- TypeScript estricto
- Tailwind CSS 4
- Zustand 5
- Rick and Morty API

## Ejecución

Requiere Node.js 22.12 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

Comprobación disponible:

```bash
pnpm build
```

Para revisar errores visualmente sin modificar el código:

```text
http://localhost:4321/?apiError=404
http://localhost:4321/?apiError=429
http://localhost:4321/?apiError=500
```

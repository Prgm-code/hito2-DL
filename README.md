# Hito 2 de **Curso - Java - Globant Talento Ready**

## Portal de Turismo Interdimensional

Aplicación demostrativa para explorar destinos, elegir acompañantes y guardar
reservas interdimensionales con datos de
[Rick and Morty API](https://rickandmortyapi.com/).

> Lo que comenzó como un ejercicio sencillo terminó con un poco de sobreingeniería:
> se construyó más de lo necesario, pero se aprovechó para aprender y experimentar. 😅

## Proyecto desplegado

[https://hito2-dl.vercel.app](https://hito2-dl.vercel.app)

Astro se usa para las páginas y el HTML inicial. Toda la interacción del navegador
está escrita con TypeScript Vanilla, eventos del DOM, `fetch`, módulos ES nativos y
`localStorage`. Astro utiliza Vite como servidor de desarrollo y herramienta de
compilación. Zustand se conserva únicamente para centralizar y persistir el estado.

## Cumplimiento de la rúbrica — Hito 2

### Pilar 1: modelado de datos en TypeScript

| Requisito | Evidencia directa |
| --- | --- |
| Cero `any` | El código de `src/` no utiliza `any`; los errores externos se reciben como `unknown`. El proyecto extiende la configuración estricta de Astro en [`tsconfig.json`](tsconfig.json). |
| Estados críticos con `enum` | [`src/models/reservation.ts`](src/models/reservation.ts) declara `TripType`, `RiskLevel`, `ReservationStatus` y `PlannerView`. [`src/models/rick-and-morty.ts`](src/models/rick-and-morty.ts) declara `CharacterStatus`. |
| Interfaces estructuradas | Las entidades están declaradas como interfaces exportadas dentro de [`src/models/`](src/models/): `Reservation`, `ReservationDraft`, `Quote`, `Character`, `Location`, `Episode`, `ApiPage<T>` y contratos de petición. |
| Entradas controladas | [`parseTripType()`](src/scripts/travel-planner/booking.ts) comprueba el valor recibido antes de convertirlo en un estado válido. No se confía solamente en una aserción `as`. |

Las transiciones de una reserva también consumen los enums explícitamente en
[`src/stores/travelStore.ts`](src/stores/travelStore.ts), por ejemplo:

```ts
reservation.status === ReservationStatus.CONFIRMED
  ? { ...reservation, status: ReservationStatus.IN_PROGRESS }
  : reservation;
```

### Pilar 2: DOM y formularios

| Requisito | Evidencia directa |
| --- | --- |
| Guardias de nulidad | [`bindEvents()`](src/scripts/travel-planner/events.ts) obtiene los nodos raíz con `document.getElementById(...) as HTML...Element \| null` y comprueba explícitamente si son `null` antes de registrar eventos. |
| Neutralización del formulario | [`submitReservation()`](src/scripts/travel-planner/booking.ts) ejecuta `event.preventDefault()` como primera instrucción. |
| Controles especializados | Formulario, inputs, selects y áreas de texto usan tipos como `HTMLFormElement`, `HTMLInputElement`, `HTMLSelectElement` y `HTMLTextAreaElement`. |
| Lectura y limpieza | [`readDraft()`](src/scripts/travel-planner/booking.ts) usa `FormData`, `trim()`, `Number()` y `parseTripType()`. |
| Validación reactiva | [`validateReservation()`](src/utils/travelRules.ts) valida nombre, correo, fecha, pasajeros, acompañantes y seguro antes de guardar. |
| Error visible | Los errores se insertan en un bloque accesible con `role="alert"` y contenido creado mediante `textContent`. |

Flujo del formulario:

```text
submit
  → preventDefault()
  → readDraft()
  → validateReservation()
  ├─ inválido: mostrar errores en el DOM
  └─ válido: crear y persistir la reserva
```

### Pilar 3: asincronía y bloques de control

| Requisito | Evidencia directa |
| --- | --- |
| `async/await` | Las cargas iniciales, catálogo, acompañantes y viaje usan funciones `async`; no existen cadenas `.then()` anidadas. |
| `try/catch/finally` | [`request<T>()`](src/services/rickAndMortyApi.ts) envuelve `fetch`, controla timeout y siempre finaliza el estado de carga. |
| Validación HTTP | El servicio comprueba `response.ok` y lanza un error tipado para respuestas 4xx o 5xx. |
| Carga antes de la red | [`loadInitialData()`](src/scripts/travel-planner/index.ts) y [`loadCatalog()`](src/scripts/travel-planner/catalog.ts) renderizan el indicador de carga antes de iniciar las peticiones. |
| Error visible y reintento | [`src/ui/apiErrorElements.ts`](src/ui/apiErrorElements.ts) genera mensajes descriptivos dentro del DOM y botones de reintento. |

Las ubicaciones y los personajes se cargan en paralelo con `Promise.all()`. No hay
reintentos automáticos: si una petición falla, la interfaz explica el problema y deja
que el usuario decida cuándo volver a intentar.

## Funcionalidades

- Catálogo paginado con búsqueda y filtro por tipo.
- Formulario validado y cálculo automático de precio y riesgo.
- Selección de hasta tres acompañantes vivos.
- Reservas persistidas en `localStorage["reservas"]` mediante Zustand.
- Inicio, cancelación y finalización de viajes.
- Estados visibles de carga, vacío y error.
- Página 404 personalizada.

## Tecnologías

- Astro 7 para páginas y componentes estáticos.
- TypeScript Vanilla estricto para la interacción del navegador.
- Vite, integrado por Astro, para desarrollo y compilación.
- Módulos ES nativos.
- Zustand 5 para estado y persistencia.
- Tailwind CSS 4 para estilos.
- Rick and Morty API como servicio externo.

## Estructura principal

```text
src/
├── components/   HTML inicial mediante componentes Astro
├── models/       enums e interfaces del dominio
├── pages/        rutas de la aplicación
├── scripts/      eventos, formulario y renderizado Vanilla TypeScript
├── services/     consumo de la API con fetch
├── stores/       estado centralizado con Zustand
├── ui/           creación de elementos del DOM
└── utils/        validaciones y reglas del viaje
```

Los imports internos usan aliases declarados dentro de `compilerOptions.paths` en
[`tsconfig.json`](tsconfig.json). Así se evita depender de rutas frágiles como
`../../services/...`:

```ts
import type { Reservation } from "models/reservation";
import { getLocations } from "services/rickAndMortyApi";
import { travelStore } from "stores/travelStore";
import { createElement } from "ui/dom";
```

Hay aliases específicos para `assets`, `components`, `layouts`, `models`, `scripts`,
`services`, `stores`, `styles`, `ui` y `utils`; `@/*` queda disponible como acceso
general a cualquier módulo dentro de `src/`.

## Instalación y ejecución

Requiere Node.js 22.12 o superior. El proyecto utiliza pnpm:

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
```

Los comandos solicitados literalmente por la rúbrica también son compatibles:

```bash
npm install
npm run dev
npm run check
npm run build
```

`check` ejecuta `astro check`. `build` ejecuta primero la misma verificación estricta
de TypeScript y, solo si no hay errores, genera el sitio con `astro build`.

Para revisar los estados visuales de error sin modificar el código:

```text
https://hito2-dl.vercel.app/?apiError=404
https://hito2-dl.vercel.app/?apiError=429
https://hito2-dl.vercel.app/?apiError=500
```

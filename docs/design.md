# HA Dashboard – Diseño Técnico

## 1. Objetivo y alcance
- Construir un dashboard web para Home Assistant (HA) que funcione como SPA sin SSR (sin Next.js).
- Consumir la REST API de HA para listar entidades agrupadas por zonas/áreas y luego evolucionar hacia actualizaciones en tiempo real.
- Mantener separación clara front/back: React + TanStack Router/Query en el cliente, backend Node/Express como proxy hacia HA.

### Metas inmediatas
1. Render inicial de todas las entidades agrupadas por área.
2. Manejar estados de carga/errores de manera consistente en UI.
3. Abstraer llamadas a Home Assistant en un cliente reutilizable en el backend.

### Metas futuras
- Streaming en tiempo real (WS/SSE) para reflejar cambios instantáneos.
- Controles para acciones sobre entidades (encender/apagar, etc.).
- Dashboards configurables en base a preferencias del usuario.

### Fuera de alcance (por ahora)
- Autenticación de usuarios finales (se asume ambiente controlado).
- Automatizaciones complejas o edición de entidades desde el dashboard.

## 2. Arquitectura general
```
[React SPA] --fetch--> [/api/* Backend Express] --HTTP--> [Home Assistant API]
                                           \
                                            -> [WS/SSE proxy (futuro)]
```

### Frontend
- Stack: Vite + React + TypeScript usando npm clásico (sin workspaces por ahora).
- Routing: TanStack Router para mantenernos en el ecosistema TanStack.
- Data fetching/cache: TanStack Query. Los loaders de las rutas se apoyan en Query hooks.
- UI State ligero (modo oscuro, filtros) manejado con context + Zustand o simple contexto React.
- Sistema de dashboards y cards: cada dashboard representa un layout específico (energía, general, etc.) que compone "cards". Las cards son componentes reutilizables definidos por tipo (`energy-consumption`, `climate-status`, etc.) y sólo existe una implementación por tipo para toda la app.

### Backend
- Node 18+ con Express + TypeScript (toolchain npm estándar) y SQLite para persistencia liviana.
- Estructura propuesta:
  - `src/server.ts`: bootstrap Express.
  - `src/routes/entities.ts`: rutas REST (`GET /api/entities`).
  - `src/ha/client.ts`: cliente HTTP hacia HA (usa `fetch`/`axios`).
  - `src/ha/entities.ts`: lógica de agregación (agrupa entidades por área).
  - `src/ha/events.ts`: stub para conexiones WebSocket (tiempo real).
  - `src/db/index.ts`: inicializa SQLite y expone helpers CRUD para dashboards/favoritos.
  - `src/repos/dashboardsRepo.ts`: acceso a dashboards (lectura/escritura, favoritos, layout).
- Config vía `.env` (p.ej. `HA_BASE_URL`, `HA_TOKEN`).

### Comunicación
- Frontend habla únicamente con el backend propio vía `/api/*`.
- Vite dev server usa proxy a `http://localhost:<backend-port>` para evitar CORS.
- Respuestas JSON con un contrato claro (ver sección 4).

## 3. Home Assistant API y modelo de datos
- Endpoints iniciales:
  - `GET /api/states`: lista completa de entidades con `state`, `attributes`, `entity_id`, `area_id` (puede venir vacío).
  - `GET /api/config/areas`: metadatos de áreas (name, id).
- El cliente HA debe combinar ambos recursos para producir `AreaWithEntities`:
```ts
interface Area {
  id: string;
  name: string;
}
interface EntitySummary {
  id: string; // entity_id en HA
  name: string;
  state: string;
  domain: string; // luz, sensor, etc.
  attributes: Record<string, unknown>;
}
interface AreaWithEntities {
  area: Area;
  entities: EntitySummary[];
}
```
- Entidades sin `area_id` caerán en una pseudo-área `unassigned`.

## 4. API backend (fase 1)
| Método | Ruta               | Descripción                                   | Response |
|--------|--------------------|-----------------------------------------------|----------|
| GET    | `/api/health`      | Verifica configuración/tokens válidos.       | `{ ok: true }` o error |
| GET    | `/api/entities`    | Devuelve arreglo de `AreaWithEntities`.      | `AreaWithEntities[]` |
| GET    | `/api/dashboards`  | Lista dashboards persistidos en SQLite.      | `Dashboard[]` |
| POST   | `/api/dashboards`  | Crea/actualiza dashboard (layout/cards).     | `Dashboard` |
| POST   | `/api/favorites`   | Marca cards/dashboards favoritos.            | `{ ok: true }` |

- Errores: usar códigos estándar (`400` config inválida, `401` token inválido – propagado desde HA, `502` cuando HA está caído).
- Middleware de cache opcional (p.ej. TTL corto en memoria) para reducir presión inicial.

## 5. Frontend – routing, dashboards y data flow
- Jerarquía inicial de rutas TanStack:
```
/
├── dashboards/
│   └── $dashboardId (render del dashboard seleccionado)
└── entities/
    └── index (lista de áreas cruda para depuración)
```
- Cada ruta define un `loader` que usa TanStack Query para prefetch:
```ts
const areasRoute = createRoute({
  path: '/',
  loader: ({ context }) => context.queryClient.ensureQueryData(areasQuery())
})
```
- Dashboards
  - Configuración: lista en JSON proveniente del backend (`GET /api/dashboards`) o archivo local mientras tanto.
  - Cada dashboard define: `id`, `name`, `description`, `{ cards: CardInstance[] }` donde `CardInstance` hace referencia a `cardType` y props específicas (p.ej. entity_ids).
  - Render se realiza con un "registry" de cards donde cada `cardType` mapea a un componente React único compartido por todos los dashboards.
- Hooks:
  - `useAreasQuery()` – encapsula `useQuery` para `/api/entities` (fuente de datos para múltiples cards).
  - `useDashboardsQuery()` – obtiene configuraciones de dashboards.
  - `useRealtimeEntities()` (futuro) para combinar cache inicial + stream.
- Componentes UI:
  - `DashboardView`: recibe `CardInstance[]` y resuelve cada card via registry.
  - `AreasView`: vista auxiliar para listar entidades agrupadas.
  - `CardRegistryProvider`: expone registro global para inyectar nuevas cards.
  - `EntityItem`: muestra nombre, estado, badge de dominio.
  - States: `LoadingState`, `ErrorState`, `EmptyState`.

### Cards
- Contrato por tipo:
```ts
type CardType = 'energy-consumption' | 'climate-status' | 'generic-entity-list' | string;
interface CardDefinition {
  type: CardType;
  Component: React.FC<CardProps>;
  defaultSize: { w: number; h: number };
}
interface CardInstance {
  id: string;
  cardType: CardType;
  title?: string;
  config: Record<string, unknown>; // ej: { entityIds: ['sensor.energy'] }
}
```
- Sólo hay una card por tipo cross-app. Los dashboards reusan la misma implementación al referenciar `cardType`.
- Data requirements: cada card define qué queries necesita (p.ej. `energy-consumption` usa `useAreasQuery` + filtros de dominio).
- Persistencia: dashboards y favoritos se almacenan en SQLite (tablas `dashboards`, `dashboard_cards`, `favorites`) para garantizar que los cambios del usuario se mantengan entre sesiones.

## 6. Tiempo real (fase 2)
- Home Assistant expone WebSocket API (`/api/websocket`).
- Backend actuará como proxy:
  - Mantiene conexión WS con HA.
  - Expone a frontend un SSE (`/api/events/stream`) o WS propio (`/ws`).
  - Filtra eventos relevantes (state_changed) y los remite.
- Frontend se suscribe y actualiza cache TanStack Query mediante `queryClient.setQueryData`.

## 7. Seguridad y configuración
- Backend nunca expone el token de HA al frontend.
- `.env` ejemplo:
```
HA_BASE_URL=https://mi-ha.local:8123
HA_TOKEN=eyJ0eXAi...
PORT=4000
DATABASE_URL=sqlite://./data/app.db
```
- Validaciones al arrancar: si falta token o base URL, el servidor no levanta y `GET /api/health` retorna error.
- Considerar rate limiting ligero en Express para el backend público.
- Persistencia SQLite:
  - Variable `DATABASE_URL` apuntando a archivo local (`sqlite://./data/app.db`).
  - Carpeta `data/` ignorada en git, salvo esquema/migraciones.
  - Scripts `npm run db:migrate` y `npm run db:seed` para mantener consistencia entre entornos.

## 8. Estrategia de desarrollo
1. **Bootstrap repositorio**
   - Estructura con carpetas `frontend/` y `server/`, cada una con su propio `package.json` manejado vía npm individual.
   - Configuración base TypeScript + ESLint + Prettier en ambos paquetes (compartiendo reglas vía copy/paste inicial o script).
   - Configuración SQLite inicial (carpeta `data/` ignorada en git excepto migraciones).
2. **Backend fase 1**
   - Implementar cliente HA (fetch wrapper + tests de unidad con mocks).
   - Endpoint `/api/entities` + pruebas del agrupador.
   - Configurar SQLite + repositorio de dashboards/favoritos, exponer `/api/dashboards` stub.
   - Middleware de manejo de errores y logging básico.
3. **Frontend fase 1**
   - Vite + React + TanStack Router/Query.
   - Implementar `CardRegistry` con al menos un tipo (`generic-entities`), layout de dashboards y selector de dashboard.
   - `useAreasQuery` y `useDashboardsQuery` para poblar la primera vista.
   - Proxy dev server hacia backend.
4. **Infra dev**
   - Scripts `npm run dev:server`, `npm run dev:frontend`, `npm run dev` (concurrente).
   - Documentación en README sobre cómo obtener token y correr todo.
5. **Fase 2 (realtime)**
   - Implementar proxy WS/SSE.
   - Suscripción en frontend y actualización en vivo de estados (cards podrán registrar listeners para mutar su cache).
6. **Fase 3 (acciones)**
   - Añadir endpoints POST para llamar servicios HA (`/api/services/<domain>/<service>`).
   - UI para toggles/controles y cards accionables (p.ej. `climate-control`).

## 9. Riesgos y mitigaciones
- **Dependencia del token HA**: tokens caducos → crear healthcheck y mensajes claros en UI.
- **Volumen de entidades**: algunos setups tienen cientos de entidades → paginar/filtrar en frontend, cache TTL configurable en backend.
- **Desfase en tiempo real**: fallback a polling si WS falla.
- **CORS/HTTPS**: usar proxy local en dev y recomendar reverse proxy (Nginx) en prod.

## 10. Próximos pasos inmediatos
1. Instalar dependencias del backend (Express, TypeScript, ts-node-dev, dotenv, SQLite, Jest, ESLint, Prettier) y configurar scripts npm.
2. Definir esquema inicial de SQLite (dashboards, cards, favoritos) + scripts `db:migrate`.
3. Implementar `GET /api/health` y stub de `/api/dashboards` que lee desde SQLite.
4. Implementar cliente HA + `/api/entities` con pruebas unitarias para la lógica de agrupado.

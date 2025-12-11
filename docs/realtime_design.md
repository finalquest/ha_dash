# Realtime Data Design

## Objetivo
Obtener actualizaciones en tiempo real de Home Assistant (HA) sin depender de polls constantes a `/api/states`, y entregar esos eventos a las cards (p. ej. energy-metric-panel) y dashboards favoritos.

## Componentes

### 1. Conexión WebSocket a HA
- Endpoint oficial: `ws://<HA_BASE_URL>/api/websocket`.
- Handshake: enviar `auth` con el long-lived token del backend.
- Suscripción: enviar `{"id": 1, "type": "subscribe_events", "event_type": "state_changed"}`.
- Reintentos: reconectar con backoff si la conexión se cae.

### 2. Cache en memoria
- Mantener un `Map<entity_id, EntityState>` con el último estado recibido.
- Endpoint `/api/devices/metrics/:id/state` puede leer de esta cache (fallback a `/api/states` si el cache está vacío).
- Se puede persistir en SQLite (opcional) para resiliencia en caso de reinicios.

### 3. Broadcast a frontend
Dos opciones:
1. **Server-Sent Events (`/api/events/stream`)**: fácil de consumir desde React; cada evento tiene `entityId`, `state`, `last_changed`, etc. Podemos filtrar por `device_id` antes de enviar.
2. **WebSocket propio (`ws://backend/ws`)**: más flexible si en un futuro queremos permitir mutaciones o ack del cliente.

### 4. Integración con cards
- Card `energy-metric-panel` escucha el stream y, al recibir un cambio de cualquiera de sus `entityIds`, actualiza el estado con `queryClient.setQueryData` (TanStack Query).
- Si el stream falla, el frontend puede hacer polling (reutilizando los endpoints REST).

## Consideraciones
- Autenticación: el backend usa su token; el frontend nunca habla directo con HA.
- Backpressure: la cantidad de eventos puede ser alta; se puede limitar a entidades favoritas/activas.
- Replay: opcionalmente se puede almacenar una ventana corta de eventos para que un nuevo cliente reciba el estado inicial antes de escuchar.

## Próximos pasos
1. Implementar `src/ha/events.ts` que maneje la conexión y emita eventos internos (EventEmitter/observable).
2. Crear `src/server/realtime.ts` para gestionar SSE/WS a los clientes.
3. Actualizar `energy-metric-panel` para suscribirse al stream y actualizar la UI sin refrescar la página.

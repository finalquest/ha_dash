# Metric Group Design

## Objetivo
Representar y persistir agrupaciones lógicas de entidades de Home Assistant (HA) que pertenecen al mismo dispositivo o sensor base, con el fin de alimentar cards compuestas como el panel de energía (potencia, voltaje, corriente) y abrir la puerta a consultas históricas por entidad.

## Componentes principales

### 1. Fuente de datos
- Home Assistant **no expone Device Registry via REST**, por lo que la agrupación debe inferirse a partir de `/api/states` y convenciones en `entity_id` / `friendly_name`.
- Estrategia: detectar prefijos comunes (`sensor.planta_baja_*`), comparar `device_class` y agrupar entidades que compartan base name + clases complementarias (power/voltage/current).
- Siempre permitimos overrides manuales en SQLite para corregir o definir grupos explícitos.

### 2. Esquema en SQLite
- `metric_groups`
  - `id` (UUID)
  - `device_id` (opcional, referencia a HA)
  - `name`
  - `area_id` (opcional)
  - `metadata` (JSON, p. ej. icono, color, descripción)
- `metric_group_entities`
  - `metric_group_id`
  - `metric_type` (enum: `power`, `voltage`, `current`, etc.)
  - `entity_id`
  - `friendly_name` override opcional
- `metric_group_overrides`
  - Permite mapear manualmente `entity_id` -> `metric_group_id` cuando HA no provee relaciones claras.

### 3. Servicios backend
1. `GET /api/devices/metrics`
   - Respuesta: `[{ id, name, deviceId, areaId, metrics: { power: entity_id, voltage: entity_id, ... } }]`
   - Origen: combina SQLite (config) + datos frescos del Device/Entity Registry para enriquecer nombre/icono.
2. `GET /api/devices/metrics/:id/state`
   - Usa `GET /api/states` (o cache interno) y devuelve los valores actuales de todas las entidades del grupo. Ideal para cards que muestran múltiples métricas simultáneas.
3. `GET /api/entities/:entityId/history?hours=3&interval=5m`
   - Usa `GET /api/history/period/<start>` de HA, filtra por `entityId` y normaliza a `{ timestamps: number[], values: number[] }`.
   - Se reutiliza para gráficos en cards.

### 4. Flujo de uso
1. Dashboard consulta `/api/devices/metrics` para listar grupos disponibles y decidir qué card `energy-metric-panel` mostrar.
2. Card solicita `/api/devices/metrics/:id/state` para mostrar Potencia/Voltaje/Corriente actuales.
3. Si necesita gráfico, llama `/api/entities/:entityId/history` usando la entidad configurada en `historyMetric`.
4. Futuros dashboards podrán definir sus propios groups (ej. `climate-metric-panel`) siguiendo la misma estructura.

### 5. Sincronización y overrides
- Al iniciar el backend se sincroniza con los registros de HA y se guardan/actualizan grupos en SQLite.
- Si un usuario quiere ajustar qué entidades integra un grupo, actualiza `metric_group_entities` o usa un editor futuro en UI.
- La configuración manual tiene prioridad sobre lo inferido automáticamente.

## Próximos pasos técnicos
1. Crear migraciones SQLite para las tablas mencionadas.
2. Implementar un servicio que sincronice Device/Entity Registry → SQLite, preservando overrides.
3. Exponer los endpoints (`/api/devices/metrics`, `/api/devices/metrics/:id/state`, `/api/entities/:entityId/history`).
4. Añadir fixtures en `server/docs/responses/` para device/entity registry e historial, facilitando tests.
5. Consumir estos endpoints desde la card `energy-metric-panel` en el frontend.

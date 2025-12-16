# Dashboard de Climatización

## Objetivo
Crear una nueva vista "Climate Live" que combine ventiladores (`fan.*`), aires acondicionados y otros dispositivos de HVAC, mostrando estado encendido/apagado y controles básicos (porcentaje o preset).

## Datos disponibles
Ejemplo de entidad `fan` expuesta por Home Assistant:
```json
{
  "entity_id": "fan.ventilador_oficina",
  "state": "on",
  "attributes": {
    "friendly_name": "Ventilador Oficina",
    "percentage": 50,
    "supported_features": 1
  },
  "last_changed": "2025-12-15T19:02:11.123456+00:00",
  "last_updated": "2025-12-15T19:02:11.123456+00:00"
}
```
- `supported_features` (bitmask) indica capacidades: `1` = soporta porcentaje. (Más adelante podríamos mapear otros valores, p.ej. dirección, preset mode.)
- Los ACs (`climate.*`) exponen `hvac_mode`, `temperature`, `fan_mode`, etc. y ya existen endpoints para togglear (podemos reutilizar `/api/lights` o generalizar `callService`).

## Backend
1. **Client**: ampliar `HomeAssistantClient.callService` para aceptar cualquier dominio (ya existe). Añadir helpers específicos if needed (`setFanPercentage(domain='fan', service='set_percentage')`).
2. **Routes**:
   - `POST /api/fans/:entityId/toggle` → `fan.toggle`.
   - `POST /api/fans/:entityId/percentage` body `{ percentage: number }` → `fan.set_percentage` (requiere `supported_features & 1`).
   - Reusar SSE de `state_changed` para updates; no se requiere endpoint adicional.

## Frontend
### Vista Climate Live
- Ruta `/climate` similar a Lights/Switches dashboards.
- Agrupa entidades en dos secciones: "Fans" (`fan.*`) y "AC" (`climate.*`).
- Cada sección reusa cards específicas.

### FanCard
- Props: `entity: HaEntity`, `onToggle`, `onChangePercentage`, `disabled?`, `isFavorite`, `onToggleFavorite`.
- UI: icono grande de ventilador, estado `On/Off`, slider/knob para porcentaje (si soporta). Slider simple (`input[type=range]`) del 0-100; mostrar valor actual.
- Eventos:
  - Tap en la card → `fan.toggle` (similar a LightCard).
  - Slider `onChange` → `fan.set_percentage` (debounce o botón "Aplicar").
- Favoritos: permitir guardarla igual que Lights/Switches.

### Integración en Dashboard
- `DashboardView` debe saber renderizar `fan.*` favoritos usando `FanCard`. La lógica de drag & drop y favoritos ya existe; solo agregar el branch de dominio `fan`.

### Estado en vivo
- El SSE ya actualiza `['entities']`, por lo que al cambiar en HA veremos estado y porcentaje al instante.

## UX Consideraciones
- Slider debe bloquearse mientras un cambio está en curso para evitar spam.
- Mostrar la última acción (p.ej. "Actualizado hace 5s") en tooltip/texto.
- Para entidades sin soporte de porcentaje (`supported_features` distinto), ocultar el slider y solo mostrar On/Off.

## Roadmap
1. Backend: endpoints `POST /api/fans/:entityId/{toggle,percentage}` (similar a lights).
2. Frontend: `FanCard` + `/climate` view con grid de fans/climate.
3. Integrar fans en Dashboard favorites + reordenamiento.
4. Extender para `climate.*` (set temperature/mode) en siguiente iteración.

# Drag & Drop de favoritos en Dashboard

## Objetivo
Permitir reordenar las cards favoritas del dashboard arrastrando y soltando, persistiendo el orden en la base de datos para que quede consistente entre sesiones y dispositivos.

## Backend
- Exponer `PUT /api/favorites/reorder`.
  - Payload: `{ order: string[] }` donde cada string es un `favorite.id` en el orden final.
  - Validar que todos los IDs existan antes de actualizar.
  - Actualizar `order_index` secuencialmente dentro de una transacción (`UPDATE favorites SET order_index = @index WHERE id = @id`).
  - Devolver `{ ok: true }` o error.
- Opcional: emitir un evento en el hub SSE (`favorite_reordered`) para informar a otros clientes sin esperar un refetch.

## Frontend
### Integración TanStack Query
- Seguir usando `useFavorites()` para cargar las cards. El `order_index` determina el orden por defecto.
- Implementar `useReorderFavorites` (mutation) que reciba la nueva lista de IDs y llame al endpoint `PUT /api/favorites/reorder`.
- Al completar la mutación, invalidar `['favorites']` para obtener el orden definitivo del backend o, mejor aún, actualizar optimistamente la cache antes de invalidar.

### Drag & Drop
- Usar `@dnd-kit/core` (o similar) en `DashboardView`.
  - Envolver el grid de favoritos con `<DndContext>` y `<SortableContext>`.
  - Cada card favorita (entity, energía, luces, switches) recibe props (`attributes`, `listeners`, `setNodeRef`) para ser sortable.
  - Se renderiza un handle (ícono) y se cambia `cursor: grab`/`grabbing` cuando se arrastra.
  - `onDragEnd` entrega `active.id` y `over?.id`; si cambió, reordenar el array local (usar `arrayMove` de dnd-kit) y luego ejecutar `useReorderFavorites.mutate({ order: newOrderIds })`.
  - Mientras la mutación esté en curso, se puede mostrar un spinner pequeño o bloquear nuevas interacciones para evitar descuadres.

### Estados y fallback
- Si la mutación falla, revertir al orden previo (guardar snapshot antes de mover) y mostrar una notificación de error.
- Para usuarios sin drag (pantallas táctiles viejas), se puede agregar un menú contextual con “Mover arriba/abajo” como fallback.

## UI/UX notas
- Mostrar un “handle” visual en la esquina de la card para indicar que se puede arrastrar. Sólo ese handle debería iniciar el drag para evitar conflictos con el toggle o la estrella de favoritos.
- Mantener animaciones suaves (`transition` en `transform`) para que el movimiento sea fluido.
- En móviles, considerar un modo de edición (botón “Reordenar”) para no interferir con el toque normal.

## Futuro
- Propagar `favorite_reordered` por SSE para que otras ventanas/browsers reflejen el nuevo orden al instante.
- Extender el mismo patrón a dashboards configurables una vez que se agreguen cards dinámicas.

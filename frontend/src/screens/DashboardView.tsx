import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFavorites, useFavoriteToggle, useReorderFavorites } from '../hooks/useFavorites';
import { useEntities } from '../hooks/useEntities';
import { useMetricGroups } from '../hooks/useMetricGroups';
import type { FavoriteEntry } from '../api/types';
import { EntityCard } from '../components/EntityCard';
import { EnergyMetricGroupCard } from '../components/EnergyMetricGroupCard';
import { LightCard } from '../components/LightCard';
import { SwitchCard } from '../components/SwitchCard';
import { useLightControl } from '../hooks/useLightControl';

const renderUnsupportedCard = (favorite: FavoriteEntry) => (
  <article key={favorite.id} className="entity-card">
    <header>
      <h4>{favorite.title ?? favorite.cardType}</h4>
    </header>
    <p>Este tipo de card aún no está soportado en favoritos.</p>
  </article>
);

export const DashboardView = () => {
  const { data: favorites = [], isLoading, isError, error } = useFavorites();
  const {
    data: entities = [],
    isLoading: isLoadingEntities,
    isError: entitiesError,
    error: entitiesErrorMessage,
  } = useEntities();
  const {
    data: metricGroups = [],
    isLoading: isLoadingMetricGroups,
    isError: metricGroupsError,
    error: metricGroupsErrorMessage,
  } = useMetricGroups();
  const toggleFavorite = useFavoriteToggle();
  const lightControl = useLightControl();
  const reorderFavoritesMutation = useReorderFavorites();
  const [isEditing, setIsEditing] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderedIds(favorites.map((favorite) => favorite.id));
  }, [favorites]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const entityMap = useMemo(() => new Map(entities.map((entity) => [entity.entity_id, entity])), [entities]);
  const metricGroupMap = useMemo(
    () => new Map(metricGroups.map((group) => [group.id, group])),
    [metricGroups],
  );

  const sortedFavorites = useMemo(() => {
    const map = new Map(favorites.map((favorite) => [favorite.id, favorite] as const));
    return orderedIds.map((id) => map.get(id)).filter((fav): fav is NonNullable<typeof fav> => Boolean(fav));
  }, [favorites, orderedIds]);

  const energyFavorites = sortedFavorites.filter((favorite) => favorite.cardType === 'energy-metric-panel');
  const entityFavorites = sortedFavorites.filter((favorite) => favorite.cardType === 'entity');

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds((current) => {
      const oldIndex = current.indexOf(active.id as string);
      const newIndex = current.indexOf(over.id as string);
      const next = arrayMove(current, oldIndex, newIndex);
      reorderFavoritesMutation.mutate(next);
      return next;
    });
  };

  const renderFavoriteCard = (favorite: FavoriteEntry, { editing = false }: { editing?: boolean } = {}) => {
    const entityId = favorite.config?.entity_id;
    const entity = entityId ? entityMap.get(entityId) : undefined;
    if (!entity) {
      return (
        <article key={favorite.id} className="entity-card">
          <header>
            <h4>{favorite.title ?? entityId ?? 'Entidad desconocida'}</h4>
          </header>
          <p>No encontramos esta entidad en Home Assistant.</p>
        </article>
      );
    }

    const domain = entity.entity_id.split('.')[0];
    const friendlyName = (entity.attributes.friendly_name as string | undefined)?.toLowerCase() ?? '';
    const deviceClass = (entity.attributes.device_class as string | undefined)?.toLowerCase() ?? '';
    const looksLikeLight =
      domain === 'light' || friendlyName.includes('light') || friendlyName.includes('luz') || deviceClass.includes('light');

    const handleToggleFavorite = () => toggleFavorite.mutate({ entity, favorite });

    if (looksLikeLight) {
      return (
        <LightCard
          key={favorite.id}
          entity={entity}
          onToggle={(candidate) => {
            if (!editing) {
              lightControl.mutate(candidate.entity_id);
            }
          }}
          disabled={editing || lightControl.isPending}
          isFavorite
          onToggleFavorite={editing ? undefined : handleToggleFavorite}
          favoriteDisabled={toggleFavorite.isPending}
        />
      );
    }

    if (domain === 'switch') {
      return (
        <SwitchCard
          key={favorite.id}
          entity={entity}
          onToggle={(candidate) => {
            if (!editing) {
              lightControl.mutate(candidate.entity_id);
            }
          }}
          disabled={editing || lightControl.isPending}
          isFavorite
          onToggleFavorite={editing ? undefined : handleToggleFavorite}
          favoriteDisabled={toggleFavorite.isPending}
        />
      );
    }

    return (
      <EntityCard
        key={favorite.id}
        entity={entity}
        isFavorite
        onToggleFavorite={editing ? undefined : handleToggleFavorite}
        favoriteDisabled={toggleFavorite.isPending}
      />
    );
  };
  const renderEnergyFavorite = (favorite: FavoriteEntry) => {
    const groupId =
      (favorite.config as { groupId?: string; group_id?: string })?.groupId ||
      (favorite.config as { group_id?: string }).group_id;
    const group = groupId ? metricGroupMap.get(groupId) : undefined;
    if (!group) {
      return (
        <article key={favorite.id} className="entity-card">
          <header>
            <h4>{favorite.title ?? 'Grupo de energía'}</h4>
          </header>
          <p>No encontramos este grupo de energía.</p>
        </article>
      );
    }

    return (
      <div key={favorite.id} className="favorite-energy-card">
        <button
          className="favorite-btn favorite-btn--active favorite-btn--overlay"
          title="Quitar de favoritos"
          type="button"
          disabled={toggleFavorite.isPending}
          onClick={() => toggleFavorite.mutate({ favorite })}
        >
          ★
        </button>
        <EnergyMetricGroupCard group={group} />
      </div>
    );
  };

  if (isLoading || isLoadingEntities || isLoadingMetricGroups) {
    return (
      <section className="panel">
        <p>Cargando favoritos...</p>
      </section>
    );
  }

  if (isError || entitiesError || metricGroupsError) {
    const message =
      (error as Error | undefined)?.message ||
      (entitiesErrorMessage as Error | undefined)?.message ||
      (metricGroupsErrorMessage as Error | undefined)?.message ||
      'No pudimos cargar tus favoritos.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  if (sortedFavorites.length === 0) {
    return (
      <section className="panel">
        <h2>Dashboard</h2>
        <p>Mostrá tus entidades favoritas seleccionándolas desde la vista de Entidades.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="dashboard-actions">
        <button type="button" onClick={() => setIsEditing((prev) => !prev)}>
          {isEditing ? 'Terminar edición' : 'Reordenar cards'}
        </button>
      </div>

      {energyFavorites.length > 0 && (
        <div className={`energy-cards-grid favorite-energy-grid${isEditing ? ' entity-grid--editing' : ''}`}>
          {isEditing ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={energyFavorites.map((fav) => fav.id)} strategy={verticalListSortingStrategy}>
                {energyFavorites.map((favorite) => (
                  <SortableItem key={favorite.id} id={favorite.id}>
                    {renderEnergyFavorite(favorite)}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            energyFavorites.map((favorite) => renderEnergyFavorite(favorite))
          )}
        </div>
      )}

      {entityFavorites.length > 0 && (
        <div className={`entity-grid${isEditing ? ' entity-grid--editing' : ''}`}>
          {isEditing ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entityFavorites.map((fav) => fav.id)} strategy={verticalListSortingStrategy}>
                {entityFavorites.map((favorite) => (
                  <SortableItem key={favorite.id} id={favorite.id}>
                    {renderFavoriteCard(favorite, { editing: true })}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            entityFavorites.map((favorite) => renderFavoriteCard(favorite))
          )}
        </div>
      )}

      {sortedFavorites
        .filter((favorite) => favorite.cardType !== 'entity' && favorite.cardType !== 'energy-metric-panel')
        .map((favorite) => renderUnsupportedCard(favorite))}
    </section>
  );
};
const SortableItem = ({ id, children }: { id: string; children: ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

import { useMemo } from 'react';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { useEntities } from '../hooks/useEntities';
import { useMetricGroups } from '../hooks/useMetricGroups';
import type { FavoriteEntry } from '../api/types';
import { EntityCard } from '../components/EntityCard';
import { EnergyMetricGroupCard } from '../components/EnergyMetricGroupCard';

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

  const entityMap = useMemo(() => new Map(entities.map((entity) => [entity.entity_id, entity])), [entities]);
  const metricGroupMap = useMemo(
    () => new Map(metricGroups.map((group) => [group.id, group])),
    [metricGroups],
  );

  const entityFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.cardType === 'entity'),
    [favorites],
  );
  const energyFavorites = useMemo(
    () => favorites.filter((favorite) => favorite.cardType === 'energy-metric-panel'),
    [favorites],
  );

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

  if (favorites.length === 0) {
    return (
      <section className="panel">
        <h2>Dashboard</h2>
        <p>Mostrá tus entidades favoritas seleccionándolas desde la vista de Entidades.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="panel">
        <h2>Dashboard</h2>
        <p>Estas son tus cards favoritas.</p>
      </div>

      {energyFavorites.length > 0 && (
        <div className="energy-cards-grid favorite-energy-grid">
          {energyFavorites.map((favorite) => {
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
          })}
        </div>
      )}

      {entityFavorites.length > 0 && (
        <div className="entity-grid">
          {entityFavorites.map((favorite) => {
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

            return (
              <EntityCard
                key={favorite.id}
                entity={entity}
                isFavorite
                onToggleFavorite={() => toggleFavorite.mutate({ entity, favorite })}
                favoriteDisabled={toggleFavorite.isPending}
              />
            );
          })}
        </div>
      )}

      {favorites
        .filter((favorite) => favorite.cardType !== 'entity' && favorite.cardType !== 'energy-metric-panel')
        .map((favorite) => renderUnsupportedCard(favorite))}
    </section>
  );
};

import { useMemo } from 'react';
import type { HaEntity, FavoriteEntry } from '../api/types';
import { useEntities } from '../hooks/useEntities';
import { LightCard } from '../components/LightCard';
import type { LinkedEntityControl } from '../components/LinkedEntitiesSection';
import { useLightControl, useLightBrightness } from '../hooks/useLightControl';
import { useFavorites, useFavoriteToggle } from '../hooks/useFavorites';
import { useSceneActivate } from '../hooks/useSceneActivate';
import { buildLightSceneAssociations, stripGroupNameFromScene } from '../lib/lightSceneGrouping';

const isLightEntity = (entity: HaEntity) => {
  const domain = entity.entity_id.split('.')[0];
  const deviceClass = (entity.attributes.device_class as string | undefined)?.toLowerCase();
  const friendlyName = (entity.attributes.friendly_name as string | undefined)?.toLowerCase();

  const looksLikeLight = friendlyName?.includes('luz') || friendlyName?.includes('light');
  const lightDeviceClass = deviceClass === 'light' || deviceClass === 'illuminance';

  if (domain === 'light') {
    return true;
  }

  if (domain === 'switch') {
    return looksLikeLight || lightDeviceClass;
  }

  return looksLikeLight || lightDeviceClass;
};

export const LightsDashboardView = () => {
  const {
    data: entities = [],
    isLoading,
    isError,
    error,
  } = useEntities();
  const lightControl = useLightControl();
  const lightBrightnessControl = useLightBrightness();
  const sceneActivate = useSceneActivate();
  const { data: favorites = [] } = useFavorites();
  const toggleFavorite = useFavoriteToggle();

  const lightEntities = useMemo(() => entities.filter(isLightEntity), [entities]);
  const lightSceneAssociations = useMemo(() => buildLightSceneAssociations(entities), [entities]);

  const grouped = useMemo(() => {
    return lightEntities.reduce<Record<string, { label: string; items: HaEntity[] }>>((acc, entity) => {
      const areaId = (entity.attributes.area_id as string | undefined) ?? 'unassigned';
      if (!acc[areaId]) {
        const areaName =
          (entity.attributes.area_name as string | undefined) ||
          (areaId === 'unassigned' ? 'Sin zona' : areaId);
        acc[areaId] = { label: areaName, items: [] };
      }
      acc[areaId].items.push(entity);
      return acc;
    }, {});
  }, [lightEntities]);

  const favoriteMap = useMemo(() => {
    return favorites.reduce<Map<string, FavoriteEntry>>((acc, favorite) => {
      if (favorite.cardType !== 'entity') return acc;
      const entityId = favorite.config?.entity_id;
      if (typeof entityId === 'string') {
        acc.set(entityId, favorite);
      }
      return acc;
    }, new Map());
  }, [favorites]);

  if (isLoading) {
    return (
      <section className="panel">
        <p>Cargando luces...</p>
      </section>
    );
  }

  if (isError) {
    const message = (error as Error | undefined)?.message ?? 'No pudimos cargar las luces.';
    return (
      <section className="panel">
        <p>{message}</p>
      </section>
    );
  }

  const handleToggle = (entity: HaEntity) => {
    lightControl.mutate(entity.entity_id);
  };

  const handleBrightness = (entity: HaEntity, percentage: number) => {
    lightBrightnessControl.mutate({ entityId: entity.entity_id, percentage });
  };

  const buildSceneLinks = (entity: HaEntity): LinkedEntityControl[] => {
    const associatedScenes = lightSceneAssociations.get(entity.entity_id) ?? [];
    if (associatedScenes.length === 0) {
      return [];
    }
    const groupFriendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
    const latestSceneTimestamp = associatedScenes.reduce<string | undefined>((latest, scene) => {
      const sceneTimestamp = scene.attributes.__ha_dash_last_triggered as string | undefined;
      if (!sceneTimestamp) {
        return latest;
      }
      if (!latest || sceneTimestamp > latest) {
        return sceneTimestamp;
      }
      return latest;
    }, undefined);

    return associatedScenes.map((scene) => {
      const lastTriggered = scene.attributes.__ha_dash_last_triggered as string | undefined;
      return {
        entity: scene,
        onToggle: () => sceneActivate.mutate(scene.entity_id),
        disabled: sceneActivate.isPending,
        label: stripGroupNameFromScene(
          (scene.attributes.friendly_name as string | undefined) ?? scene.entity_id,
          groupFriendlyName,
        ),
        hideDescription: true,
        hideState: true,
        isActiveOverride: Boolean(lastTriggered && latestSceneTimestamp && lastTriggered === latestSceneTimestamp),
      };
    });
  };

  return (
    <section>

      {Object.entries(grouped).map(([areaId, group]) => (
        <section key={areaId} className="panel entity-group">
          <h3>{group.label}</h3>
          <div className="entity-grid">
            {group.items.map((entity) => {
              const sceneLinks = buildSceneLinks(entity);
              return (
                <LightCard
                  key={entity.entity_id}
                  entity={entity}
                  onToggle={handleToggle}
                  disabled={lightControl.isPending}
                  isFavorite={favoriteMap.has(entity.entity_id)}
                  onToggleFavorite={(candidate) =>
                    toggleFavorite.mutate({ entity: candidate, favorite: favoriteMap.get(candidate.entity_id) })
                  }
                  favoriteDisabled={toggleFavorite.isPending}
                  onChangeBrightness={entity.entity_id.startsWith('light.') ? handleBrightness : undefined}
                  brightnessDisabled={lightBrightnessControl.isPending}
                  linkedEntities={sceneLinks}
                  linkedEntitiesTitle={sceneLinks.length ? 'Escenas' : undefined}
                />
              );
            })}
          </div>
        </section>
      ))}

      {lightEntities.length === 0 && (
        <section className="panel">
          <p>No encontramos entidades de luces en Home Assistant.</p>
        </section>
      )}
    </section>
  );
};

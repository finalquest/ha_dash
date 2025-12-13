import type { HaEntity } from '../api/types';

interface EntityCardProps {
  entity: HaEntity;
  areaName?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const formatValue = (entity: HaEntity) => {
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  return `${entity.state}${unit ? ` ${unit}` : ''}`;
};

export const EntityCard = ({ entity, areaName, isFavorite, onToggleFavorite, favoriteDisabled }: EntityCardProps) => {
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const deviceClass = (entity.attributes.device_class as string | undefined) ?? 'Sensor';
  const deviceId = (entity.attributes.device_id as string | undefined) ?? 'Desconocido';
  const areaLabel =
    (entity.attributes.area_name as string | undefined) ?? areaName ?? 'Sin zona';

  return (
    <article className="entity-card">
      <header>
        <h4>{friendlyName}</h4>
        <button
          className={`favorite-btn${isFavorite ? ' favorite-btn--active' : ''}`}
          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          type="button"
          onClick={() => onToggleFavorite?.(entity)}
          aria-pressed={isFavorite}
          disabled={favoriteDisabled}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </header>
      <div className="entity-card__value">{formatValue(entity)}</div>
      <p className="entity-card__type">{deviceClass}</p>
      <footer>
        <p>
          <strong>Device ID:</strong> {deviceId}
        </p>
        <p>
          <strong>Área:</strong> {areaLabel}
        </p>
      </footer>
    </article>
  );
};

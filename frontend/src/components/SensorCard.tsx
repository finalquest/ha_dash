import type { HaEntity } from '../api/types';
import { formatRelativeUpdate } from '../lib/formatRelativeUpdate';
import { formatSensorState, getSensorKind } from '../lib/sensorUtils';
import { SensorStatusIcon } from './icons/SensorStatusIcon';

interface SensorCardProps {
  entity: HaEntity;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const isBinarySensor = (entity: HaEntity) => entity.entity_id.startsWith('binary_sensor.');

const isActiveState = (entity: HaEntity) => {
  const domain = entity.entity_id.split('.')[0];
  if (domain === 'binary_sensor') {
    return entity.state === 'on';
  }
  const deviceClass = (entity.attributes.device_class as string | undefined) ?? '';
  if (['door', 'window', 'motion', 'occupancy'].includes(deviceClass)) {
    return entity.state === 'on';
  }
  return false;
};

export const SensorCard = ({ entity, isFavorite, onToggleFavorite, favoriteDisabled }: SensorCardProps) => {
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const sensorKind = getSensorKind(entity);
  const state = formatSensorState(entity);
  const area = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  const isActive = isActiveState(entity);
  const isBinary = isBinarySensor(entity);

  return (
    <article className={`sensor-card${isActive ? ' sensor-card--active' : ''}`}>
      <div className="sensor-card__header">
        <SensorStatusIcon kind={sensorKind} active={isActive} />
        {onToggleFavorite && (
          <button
            type="button"
            className={`favorite-btn favorite-btn--floating favorite-btn--sensor${isFavorite ? ' favorite-btn--active' : ''}`}
            onClick={() => onToggleFavorite(entity)}
            disabled={favoriteDisabled}
            aria-pressed={isFavorite}
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        )}
      </div>
      <div className="sensor-card__details">
        <p className="sensor-card__name">{friendlyName}</p>
        {!isBinary && <p className="sensor-card__state">{state}</p>}
        <p className="sensor-card__area">{area}</p>
        <p className="sensor-card__updated">{formatRelativeUpdate(entity.last_changed)}</p>
      </div>
    </article>
  );
};

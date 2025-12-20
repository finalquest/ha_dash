import type { HaEntity } from '../api/types';
import { LinkedEntitiesSection, type LinkedEntityControl } from './LinkedEntitiesSection';
import { formatRelativeUpdate } from '../lib/formatRelativeUpdate';
import { parseNumericAttribute } from '../lib/parseNumericAttribute';

interface ClimateUnitCardProps {
  entity: HaEntity;
  linkedEntities?: LinkedEntityControl[];
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const ThermostatIcon = () => (
  <svg viewBox="0 0 96 144" className="climate-unit-card__icon" aria-hidden>
    <rect x="36" y="12" width="24" height="120" rx="12" />
    <circle cx="48" cy="108" r="28" />
  </svg>
);

const buildTemperatureSummary = (entity: HaEntity) => {
  const current = parseNumericAttribute(entity.attributes.current_temperature);
  const target =
    parseNumericAttribute(entity.attributes.temperature) ??
    parseNumericAttribute(entity.attributes.target_temperature) ??
    parseNumericAttribute(entity.attributes.target_temp_high) ??
    parseNumericAttribute(entity.attributes.target_temp_low);
  const unit =
    (entity.attributes.temperature_unit as string | undefined) ??
    (entity.attributes.unit_of_measurement as string | undefined) ??
    '°C';
  if (typeof current === 'number' && typeof target === 'number' && current !== target) {
    return `${current.toFixed(1)}${unit} → ${target.toFixed(1)}${unit}`;
  }
  if (typeof current === 'number') {
    return `${current.toFixed(1)}${unit}`;
  }
  if (typeof target === 'number') {
    return `${target.toFixed(1)}${unit}`;
  }
  return `${entity.state}`;
};

export const ClimateUnitCard = ({
  entity,
  linkedEntities,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
}: ClimateUnitCardProps) => {
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  const hvacStatus =
    (entity.attributes.hvac_action as string | undefined) ??
    (entity.attributes.hvac_mode as string | undefined) ??
    entity.state;
  const temperatureSummary = buildTemperatureSummary(entity);

  return (
    <article className="climate-unit-card">
      {onToggleFavorite && (
        <button
          type="button"
          className={`favorite-btn favorite-btn--floating${isFavorite ? ' favorite-btn--active' : ''}`}
          onClick={() => onToggleFavorite(entity)}
          disabled={favoriteDisabled}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}
      <div className="climate-unit-card__summary">
        <ThermostatIcon />
        <div className="climate-unit-card__info">
          <p className="climate-unit-card__name">{friendlyName}</p>
          <p className="climate-unit-card__mode">{hvacStatus}</p>
          <p className="climate-unit-card__area">{areaLabel}</p>
          <p className="climate-unit-card__updated">{formatRelativeUpdate(entity.last_changed)}</p>
        </div>
        <p className="climate-unit-card__temperature">{temperatureSummary}</p>
      </div>
      <LinkedEntitiesSection entities={linkedEntities} />
    </article>
  );
};

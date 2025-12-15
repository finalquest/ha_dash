import type { HaEntity } from '../api/types';

interface LightCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  disabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const BulbIcon = ({ isOn }: { isOn: boolean }) => (
  <svg viewBox="0 0 64 80" className={`light-card__bulb-icon ${isOn ? 'on' : ''}`} aria-hidden>
    <circle cx="32" cy="24" r="20" className="bulb-head" />
    <rect x="23" y="46" width="18" height="20" rx="4" className="bulb-base" />
  </svg>
);

export const LightCard = ({
  entity,
  onToggle,
  disabled,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
}: LightCardProps) => {
  const isOn = entity.state === 'on';
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  return (
    <article className={`light-card ${isOn ? 'light-card--on' : ''}`}>
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
      <button
        type="button"
        className="light-card__action"
        onClick={() => onToggle(entity)}
        disabled={disabled}
      >
        <BulbIcon isOn={isOn} />
        <div className="light-card__details">
          <p className="light-card__name">{friendlyName}</p>
          <p className="light-card__state">{isOn ? 'On' : 'Off'}</p>
          <p className="light-card__area">{areaLabel}</p>
        </div>
      </button>
    </article>
  );
};

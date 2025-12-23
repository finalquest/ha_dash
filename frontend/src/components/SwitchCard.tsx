import type { HaEntity } from '../api/types';

interface SwitchCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  disabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const SwitchIcon = ({ isOn }: { isOn: boolean }) => (
  <svg viewBox="0 0 64 80" className={`switch-card__icon ${isOn ? 'on' : ''}`} aria-hidden>
    <rect x="20" y="15" width="24" height="50" rx="6" className="switch-body" />
    <rect x="26" y={isOn ? 20 : 40} width="12" height="20" rx="4" className="switch-thumb" />
  </svg>
);

export const SwitchCard = ({
  entity,
  onToggle,
  disabled,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
}: SwitchCardProps) => {
  const isOn = entity.state === 'on';
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';

  return (
    <article className={`switch-card ${isOn ? 'switch-card--on' : ''}`}>
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
      <div className="card-content switch-card__content">
        <button
          type="button"
          className="switch-card__action"
          onClick={() => onToggle(entity)}
          disabled={disabled}
        >
          <SwitchIcon isOn={isOn} />
          <div className="switch-card__details">
            <p className="switch-card__name">{friendlyName}</p>
            <p className="switch-card__state">{isOn ? 'On' : 'Off'}</p>
            <p className="switch-card__area">{areaLabel}</p>
          </div>
        </button>
      </div>
    </article>
  );
};

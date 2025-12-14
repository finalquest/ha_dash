import type { HaEntity } from '../api/types';

interface LightCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  disabled?: boolean;
}

const BulbIcon = ({ isOn }: { isOn: boolean }) => (
  <svg viewBox="0 0 64 80" className={`light-card__bulb-icon ${isOn ? 'on' : ''}`} aria-hidden>
    <circle cx="32" cy="24" r="20" className="bulb-head" />
    <rect x="23" y="46" width="18" height="20" rx="4" className="bulb-base" />
  </svg>
);

export const LightCard = ({ entity, onToggle, disabled }: LightCardProps) => {
  const isOn = entity.state === 'on';
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  return (
    <button
      type="button"
      className={`light-card ${isOn ? 'light-card--on' : ''}`}
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
  );
};

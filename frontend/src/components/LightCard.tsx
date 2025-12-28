import { useEffect, useMemo, useState } from 'react';
import type { HaEntity } from '../api/types';

interface LightCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  disabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
  onChangeBrightness?: (entity: HaEntity, percentage: number) => void;
  brightnessDisabled?: boolean;
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
  onChangeBrightness,
  brightnessDisabled,
}: LightCardProps) => {
  const isOn = entity.state === 'on';
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  const supportedFeatures = Number(entity.attributes.supported_features ?? 0);
  const supportedColorModes = entity.attributes.supported_color_modes;
  const isLightGroup = Array.isArray(entity.attributes.entity_id);
  const groupMembers = Array.isArray(entity.attributes.entity_id)
    ? (entity.attributes.entity_id as unknown[]).filter((member) => typeof member === 'string')
    : undefined;
  const groupMemberCount = groupMembers?.length;
  const brightnessValue = useMemo(() => {
    const brightnessAttr = entity.attributes.brightness;
    if (typeof brightnessAttr === 'number') {
      return Math.max(0, Math.min(255, brightnessAttr));
    }
    const brightnessPctAttr = entity.attributes.brightness_pct ?? entity.attributes.brightness_percent;
    if (typeof brightnessPctAttr === 'number') {
      return Math.round(Math.max(0, Math.min(100, brightnessPctAttr)) * 2.55);
    }
    return undefined;
  }, [entity.attributes.brightness, entity.attributes.brightness_pct, entity.attributes.brightness_percent]);
  const derivedPercentage = useMemo(() => {
    if (typeof brightnessValue === 'number') {
      return Math.round((brightnessValue / 255) * 100);
    }
    return undefined;
  }, [brightnessValue]);
  const supportsBrightnessCapability =
    isLightGroup ||
    typeof brightnessValue === 'number' ||
    typeof entity.attributes.brightness_pct === 'number' ||
    (Array.isArray(supportedColorModes) &&
      supportedColorModes.some((mode) => {
        const normalized = String(mode).toLowerCase();
        return ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white'].includes(normalized);
      })) ||
    ((supportedFeatures & 1) === 1);
  const showBrightnessControl = Boolean(onChangeBrightness) && supportsBrightnessCapability;
  const [pendingBrightness, setPendingBrightness] = useState<number | null>(null);
  useEffect(() => {
    setPendingBrightness(null);
  }, [entity.entity_id, derivedPercentage, brightnessDisabled]);
  const basePercentage = derivedPercentage ?? (isOn ? 100 : 0);
  const sliderValue = pendingBrightness ?? basePercentage;
  const sliderId = `light-slider-${entity.entity_id.replace(/\./g, '-')}`;
  const handleBrightnessChange = (value: number) => {
    setPendingBrightness(Math.max(0, Math.min(100, Math.round(value))));
  };
  const handleBrightnessCommit = () => {
    if (!onChangeBrightness || brightnessDisabled) return;
    const value = pendingBrightness ?? sliderValue;
    if (typeof value !== 'number') {
      return;
    }
    onChangeBrightness(entity, Math.max(0, Math.min(100, Math.round(value))));
    setPendingBrightness(null);
  };
  const handleSliderMouseUp = () => {
    handleBrightnessCommit();
  };

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
      <div className="card-content light-card__content">
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
            {isLightGroup && (
              <p className="light-card__group-label">
                Grupo de luces{typeof groupMemberCount === 'number' ? ` · ${groupMemberCount}` : ''}
              </p>
            )}
          </div>
        </button>
        {showBrightnessControl && (
          <div className="light-card__controls">
            <div className="light-card__slider-header">
              <label htmlFor={sliderId}>Brillo</label>
              <span>{`${sliderValue}%`}</span>
            </div>
            <div className="light-card__slider">
              <input
                id={sliderId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={sliderValue}
                onChange={(event) => handleBrightnessChange(Number(event.target.value))}
                disabled={brightnessDisabled}
                onMouseUp={handleSliderMouseUp}
                onTouchEnd={handleSliderMouseUp}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

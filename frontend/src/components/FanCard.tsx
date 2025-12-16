import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { HaEntity } from '../api/types';

interface FanCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  onChangePercentage?: (entity: HaEntity, percentage: number) => void;
  disabled?: boolean;
  percentageDisabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
}

const FanIcon = ({ isOn }: { isOn: boolean }) => (
  <svg viewBox="0 0 120 120" className={`fan-card__icon ${isOn ? 'fan-card__icon--on' : ''}`} aria-hidden>
    <circle cx="60" cy="60" r="12" className="fan-card__icon-center" />
    {[0, 90, 180, 270].map((angle) => (
      <ellipse
        key={angle}
        className="fan-card__blade"
        cx="60"
        cy="26"
        rx="11"
        ry="28"
        transform={`rotate(${angle} 60 60)`}
      />
    ))}
  </svg>
);

const formatRelativeUpdate = (lastChanged: string) => {
  const lastDate = new Date(lastChanged);
  if (Number.isNaN(lastDate.getTime())) {
    return 'Actualizado recientemente';
  }
  const diffSeconds = Math.max(0, Math.round((Date.now() - lastDate.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `Actualizado hace ${diffSeconds}s`;
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Actualizado hace ${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return `Actualizado hace ${diffHours}h`;
};

export const FanCard = ({
  entity,
  onToggle,
  onChangePercentage,
  disabled,
  percentageDisabled,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
}: FanCardProps) => {
  const isOn = entity.state === 'on';
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  const supportedFeatures = Number(entity.attributes.supported_features ?? 0);
  const supportsPercentage = Boolean((supportedFeatures & 1) === 1 || entity.attributes.percentage !== undefined);
  const entityPercentage = useMemo(() => {
    const value = entity.attributes.percentage;
    const numericValue =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : undefined;
    if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
      return Math.max(0, Math.min(100, numericValue));
    }
    return undefined;
  }, [entity.attributes.percentage]);
  const [pendingPercentage, setPendingPercentage] = useState<number | null>(null);
  const sliderValue = pendingPercentage ?? entityPercentage ?? 0;
  const sliderColor = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, sliderValue));
    const hue = 120 - clamped * 1.2; // 120 (green) → ~0 (red)
    return `hsl(${hue}, 70%, 50%)`;
  }, [sliderValue]);

  useEffect(() => {
    if (!percentageDisabled) {
      setPendingPercentage(null);
    }
  }, [percentageDisabled, entityPercentage]);

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setPendingPercentage(nextValue);
  };

  const commitPendingPercentage = () => {
    if (!onChangePercentage || percentageDisabled) {
      return;
    }
    setPendingPercentage((current) => {
      const nextValue = current ?? entityPercentage;
      if (typeof nextValue !== 'number' || nextValue === entityPercentage) {
        return current;
      }
      onChangePercentage(entity, nextValue);
      return null;
    });
  };

  const sliderId = `fan-slider-${entity.entity_id.replace(/\./g, '-')}`;

  return (
    <article className={`fan-card ${isOn ? 'fan-card--on' : ''}`}>
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
        className="fan-card__action"
        onClick={() => onToggle(entity)}
        disabled={disabled}
      >
        <FanIcon isOn={isOn} />
        <div className="fan-card__details">
          <p className="fan-card__name">{friendlyName}</p>
          <p className="fan-card__state">{isOn ? 'On' : 'Off'}</p>
          <p className="fan-card__area">{areaLabel}</p>
          <p className="fan-card__updated">{formatRelativeUpdate(entity.last_changed)}</p>
        </div>
      </button>
      {supportsPercentage && (
        <div className="fan-card__slider">
          <label htmlFor={sliderId}>
            Velocidad: <strong>{sliderValue}%</strong>
          </label>
          <div className="fan-card__slider-wrapper">
            <div className="fan-card__slider-track">
              <div
                className="fan-card__slider-fill"
                style={{ width: `${sliderValue}%`, backgroundColor: sliderColor }}
              />
            </div>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={sliderValue}
              onChange={handleSliderChange}
              disabled={percentageDisabled || !onChangePercentage}
              className="fan-card__slider-input"
              onPointerUp={commitPendingPercentage}
              onMouseUp={commitPendingPercentage}
              onTouchEnd={commitPendingPercentage}
              onKeyUp={(event) => {
                const commitKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'End', 'Home'];
                if (commitKeys.includes(event.key)) {
                  commitPendingPercentage();
                }
              }}
            />
          </div>
        </div>
      )}
    </article>
  );
};

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { HaEntity } from '../api/types';
import { LinkedEntitiesSection, type LinkedEntityControl } from './LinkedEntitiesSection';
import { formatRelativeUpdate } from '../lib/formatRelativeUpdate';
import { FAN_SPEED_STEPS } from '../config/dashboard';

interface FanCardProps {
  entity: HaEntity;
  onToggle: (entity: HaEntity) => void;
  onChangePercentage?: (entity: HaEntity, percentage: number) => void;
  disabled?: boolean;
  percentageDisabled?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (entity: HaEntity) => void;
  favoriteDisabled?: boolean;
  linkedEntities?: LinkedEntityControl[];
  linkedEntitiesTitle?: string;
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

export const FanCard = ({
  entity,
  onToggle,
  onChangePercentage,
  disabled,
  percentageDisabled,
  isFavorite,
  onToggleFavorite,
  favoriteDisabled,
  linkedEntities,
  linkedEntitiesTitle,
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
  const speedSteps = Math.max(1, FAN_SPEED_STEPS);
  const entityStep = useMemo(() => {
    if (entity.state === 'off') {
      return 0;
    }
    if (typeof entityPercentage !== 'number') {
      return speedSteps;
    }
    return Math.max(1, Math.round((entityPercentage / 100) * speedSteps));
  }, [entityPercentage, entity.state, speedSteps]);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const pendingStepRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<number>(entityStep);
  const sliderStep = pendingStep ?? entityStep ?? 0;
  const sliderFill = useMemo(() => {
    const clamped = Math.max(0, Math.min(speedSteps, sliderStep));
    const percentage = (clamped / speedSteps) * 100;
    const hue = 120 - percentage * 1.2;
    return { percentage, color: `hsl(${hue}, 70%, 50%)` };
  }, [sliderStep, speedSteps]);
  const sliderTicks = useMemo(() => Array.from({ length: speedSteps + 1 }, (_, index) => index), [speedSteps]);

  useEffect(() => {
    if (!percentageDisabled) {
      setPendingStep(null);
      pendingStepRef.current = null;
    }
  }, [percentageDisabled, entityStep]);

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setPendingStep(nextValue);
    pendingStepRef.current = nextValue;
  };

  useEffect(() => {
    const nextValue = pendingStepRef.current;
    if (nextValue === null) {
      return;
    }
    if (nextValue === entityStep) {
      pendingStepRef.current = null;
      setPendingStep(null);
      return;
    }
    if (percentageDisabled) {
      return;
    }
    if (nextValue <= 0) {
      if (entity.state === 'on' && lastCommittedRef.current !== 0) {
        onToggle(entity);
        lastCommittedRef.current = 0;
      }
      pendingStepRef.current = null;
      setPendingStep(null);
      return;
    }
    if (lastCommittedRef.current === nextValue) {
      return;
    }
    const percentage = Math.round((nextValue / speedSteps) * 100);
    if (onChangePercentage) {
      onChangePercentage(entity, percentage);
      lastCommittedRef.current = nextValue;
    }
    pendingStepRef.current = null;
    setPendingStep(null);
  }, [entityStep, entity.state, onChangePercentage, onToggle, percentageDisabled, speedSteps]);

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
          <label htmlFor={sliderId}>Velocidad</label>
          <div className="fan-card__slider-wrapper">
            <div className="fan-card__slider-track">
              <div
                className="fan-card__slider-fill"
                style={{ width: `${sliderFill.percentage}%`, backgroundColor: sliderFill.color }}
              />
            </div>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={speedSteps}
              step={1}
              value={sliderStep}
              onChange={handleSliderChange}
              disabled={percentageDisabled || !onChangePercentage}
              className="fan-card__slider-input"
            />
          </div>
          <div className="fan-card__slider-ticks" aria-hidden>
            {sliderTicks.map((tick) => (
              <span
                key={tick}
                className={`fan-card__slider-tick${tick === sliderStep ? ' fan-card__slider-tick--active' : ''}`}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>
      )}
      <LinkedEntitiesSection entities={linkedEntities} title={linkedEntitiesTitle} />
    </article>
  );
};

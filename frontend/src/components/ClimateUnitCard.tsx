import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
  onSetTemperature?: (entity: HaEntity, temperature: number) => void;
  temperatureDisabled?: boolean;
  onSetMode?: (entity: HaEntity, mode: string) => void;
  modeDisabled?: boolean;
}

const ThermostatIcon = () => (
  <svg viewBox="0 0 96 144" className="climate-unit-card__icon" aria-hidden>
    <rect x="36" y="12" width="24" height="120" rx="12" />
    <circle cx="48" cy="108" r="28" />
  </svg>
);

const HVAC_MODE_ICONS: Record<string, string> = {
  auto: 'A',
  cool: '❄',
  heat: '☀',
  heat_cool: '↔',
  dry: '💧',
  fan_only: '🌀',
  off: '⏻',
  eco: '♻',
  sleep: '🌙',
};

const MIN_SETPOINT = 18;
const MAX_SETPOINT = 30;

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
  onSetTemperature,
  temperatureDisabled,
  onSetMode,
  modeDisabled,
}: ClimateUnitCardProps) => {
  const friendlyName = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id;
  const areaLabel = (entity.attributes.area_name as string | undefined) ?? 'Sin zona';
  const hvacStatus =
    (entity.attributes.hvac_action as string | undefined) ??
    (entity.attributes.hvac_mode as string | undefined) ??
    entity.state;
  const temperatureSummary = buildTemperatureSummary(entity);
  const hvacModes = useMemo(() => {
    const modes = entity.attributes.hvac_modes;
    if (Array.isArray(modes)) {
      return modes.filter((mode): mode is string => typeof mode === 'string' && mode.length > 0);
    }
    return [];
  }, [entity.attributes.hvac_modes]);
  const currentMode = (entity.attributes.hvac_mode as string | undefined) ?? entity.state;
  const hvacModeLabel = currentMode ? currentMode.toLowerCase() : undefined;
  const minTempAttr = parseNumericAttribute(entity.attributes.min_temp);
  const maxTempAttr = parseNumericAttribute(entity.attributes.max_temp);
  const stepAttr = parseNumericAttribute(entity.attributes.target_temp_step);
  const minTemperatureCandidate = typeof minTempAttr === 'number' ? minTempAttr : MIN_SETPOINT;
  const maxTemperatureCandidate = typeof maxTempAttr === 'number' ? maxTempAttr : MAX_SETPOINT;
  const minTemperature = Math.min(Math.max(minTemperatureCandidate, MIN_SETPOINT), MAX_SETPOINT);
  const maxTemperature = Math.max(Math.min(maxTemperatureCandidate, MAX_SETPOINT), MIN_SETPOINT + 1);
  const temperatureStep = typeof stepAttr === 'number' && stepAttr > 0 ? stepAttr : 0.5;
  const targetTemperature =
    parseNumericAttribute(entity.attributes.temperature) ??
    parseNumericAttribute(entity.attributes.target_temperature) ??
    parseNumericAttribute(entity.attributes.target_temp_high) ??
    parseNumericAttribute(entity.attributes.target_temp_low);
  const currentTemperature = parseNumericAttribute(entity.attributes.current_temperature);
  const fallbackTemperature =
    typeof currentTemperature === 'number'
      ? currentTemperature
      : typeof targetTemperature === 'number'
        ? targetTemperature
        : (minTemperature + maxTemperature) / 2;
  const clampTemperature = (value: number) =>
    Math.max(Math.min(value, Math.max(minTemperature, maxTemperature)), Math.min(minTemperature, maxTemperature));
  const roundToStep = (value: number) => {
    const safeStep = temperatureStep || 0.5;
    const decimals = safeStep.toString().split('.')[1]?.length ?? 0;
    const rounded = Math.round(value / safeStep) * safeStep;
    const factor = 10 ** decimals;
    return Math.round(rounded * factor) / factor;
  };
  const resolvedTemperature =
    typeof targetTemperature === 'number' ? clampTemperature(targetTemperature) : clampTemperature(fallbackTemperature);
  const [pendingTemperature, setPendingTemperature] = useState<number | null>(null);
  useEffect(() => {
    setPendingTemperature(null);
  }, [entity.entity_id, resolvedTemperature, temperatureDisabled]);
  const displayedTemperature = pendingTemperature ?? resolvedTemperature;
  const temperatureDirty =
    typeof pendingTemperature === 'number' &&
    Math.abs(pendingTemperature - resolvedTemperature) > Math.max(0.05, temperatureStep / 2);
  const handleTemperatureChange = (value: number) => {
    const next = clampTemperature(roundToStep(value));
    setPendingTemperature(next);
  };
  const handleTemperatureAdjust = (direction: -1 | 1) => {
    const base = pendingTemperature ?? resolvedTemperature;
    if (typeof base !== 'number') return;
    handleTemperatureChange(base + direction * temperatureStep);
  };
  const handleTemperatureCommit = () => {
    const finalTemperature = pendingTemperature ?? resolvedTemperature;
    if (typeof finalTemperature !== 'number' || !onSetTemperature) {
      return;
    }
    onSetTemperature(entity, roundToStep(finalTemperature));
    setPendingTemperature(null);
  };
  const showTemperatureControl = Boolean(onSetTemperature);
  const showModeControl = Boolean(onSetMode) && hvacModes.length > 0;
  const controlsAvailable = showTemperatureControl || showModeControl;
  const sliderMin = Math.min(minTemperature, maxTemperature);
  const sliderMax = Math.max(minTemperature, maxTemperature);
  const sliderSpread = sliderMax - sliderMin;
  const sliderRatio =
    typeof displayedTemperature === 'number' && sliderSpread > 0
      ? Math.max(0, Math.min(1, (displayedTemperature - sliderMin) / sliderSpread))
      : 0;
  const sliderHue = 140 - sliderRatio * 140;
  const sliderColor = `hsl(${Math.max(0, Math.min(140, sliderHue))}, 70%, 50%)`;
  const sliderStyle: CSSProperties = { '--temperature-color': sliderColor };

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
      <div className="card-content climate-unit-card__content">
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
        {controlsAvailable && (
          <div className="climate-unit-card__controls">
            {showTemperatureControl && (
              <div className="climate-unit-card__control climate-unit-card__control--temperature">
                <div className="climate-unit-card__control-header">
                  <p>Objetivo</p>
                  <span>
                    {typeof displayedTemperature === 'number'
                      ? `${displayedTemperature.toFixed(1)}${
                          (entity.attributes.temperature_unit as string | undefined) ??
                          (entity.attributes.unit_of_measurement as string | undefined) ??
                          '°C'
                        }`
                      : '—'}
                  </span>
                </div>
                <div className="climate-unit-card__temp-slider">
                  <button
                    type="button"
                    className="climate-unit-card__temp-step"
                    onClick={() => handleTemperatureAdjust(-1)}
                    disabled={!onSetTemperature || temperatureDisabled}
                    aria-label="Disminuir temperatura"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step={temperatureStep}
                    value={
                      typeof displayedTemperature === 'number'
                        ? displayedTemperature
                        : sliderMin
                    }
                    onChange={(event) => handleTemperatureChange(Number(event.target.value))}
                    disabled={!onSetTemperature || temperatureDisabled}
                    style={sliderStyle}
                  />
                  <button
                    type="button"
                    className="climate-unit-card__temp-step"
                    onClick={() => handleTemperatureAdjust(1)}
                    disabled={!onSetTemperature || temperatureDisabled}
                    aria-label="Aumentar temperatura"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="climate-unit-card__apply-btn"
                  onClick={handleTemperatureCommit}
                  disabled={!onSetTemperature || temperatureDisabled || !temperatureDirty}
                >
                  Aplicar
                </button>
              </div>
            )}
            {showModeControl && (
              <div className="climate-unit-card__control climate-unit-card__control--mode">
                <p className="climate-unit-card__control-header">
                  <span>Modo</span>
                  {hvacModeLabel && <span className="climate-unit-card__chip">{hvacModeLabel}</span>}
                </p>
                <div className="climate-unit-card__mode-options">
                  {hvacModes.map((mode) => {
                    const normalizedMode = mode.toLowerCase();
                    const isActive = currentMode === mode || hvacModeLabel === normalizedMode;
                    const icon = HVAC_MODE_ICONS[normalizedMode] ?? normalizedMode.charAt(0).toUpperCase();
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`climate-unit-card__mode-btn${isActive ? ' climate-unit-card__mode-btn--active' : ''}`}
                        onClick={() => onSetMode?.(entity, mode)}
                        disabled={!onSetMode || modeDisabled || isActive}
                        aria-label={`Modo ${mode}`}
                        title={`Modo ${mode}`}
                      >
                        <span aria-hidden className="climate-unit-card__mode-icon">
                          {icon}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        <LinkedEntitiesSection entities={linkedEntities} />
      </div>
    </article>
  );
};

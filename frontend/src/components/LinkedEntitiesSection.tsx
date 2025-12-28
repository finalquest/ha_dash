import type { ReactNode } from 'react';
import type { HaEntity } from '../api/types';
import { LightGlyph } from './icons/LightGlyph';

export interface LinkedEntityControl {
  entity: HaEntity;
  onToggle?: (entity: HaEntity) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  stateOverride?: string;
  variant?: 'default' | 'icon';
  icon?: ReactNode;
  hideDescription?: boolean;
  hideState?: boolean;
  isActiveOverride?: boolean;
}

const isEntityActive = (entity: HaEntity) => {
  const inactiveStates = new Set(['off', 'idle', 'standby', 'unavailable']);
  const state = String(entity.state ?? '').toLowerCase();
  return !inactiveStates.has(state);
};

interface LinkedEntitiesSectionProps {
  entities?: LinkedEntityControl[];
  title?: string;
}

export const LinkedEntitiesSection = ({ entities, title = 'Entidades asociadas' }: LinkedEntitiesSectionProps) => {
  if (!entities || entities.length === 0) {
    return null;
  }

  return (
    <div className="device-card__linked">
      <p className="device-card__linked-title">{title}</p>
      <div className="device-card__linked-grid">
        {entities.map((item) => {
          const {
            entity,
            onToggle,
            disabled,
            label,
            description,
            stateOverride,
            variant = 'default',
            icon,
            hideDescription,
            hideState,
            isActiveOverride,
          } = item;
          const friendlyName = label ?? ((entity.attributes.friendly_name as string | undefined) ?? entity.entity_id);
          const domain = entity.entity_id.split('.')[0];
          const helperText = description ?? domain;
          const stateLabel = stateOverride ?? String(entity.state ?? '');
          const isActive = typeof isActiveOverride === 'boolean' ? isActiveOverride : isEntityActive(entity);
          const baseClass = `device-card__linked-entity${isActive ? ' device-card__linked-entity--active' : ''}`;

          if (variant === 'icon') {
            const iconContent = (
              <span className={`device-card__linked-icon${isActive ? ' device-card__linked-icon--on' : ''}`} aria-hidden>
                {icon ?? <LightGlyph />}
              </span>
            );
            if (onToggle) {
              return (
                <button
                  key={entity.entity_id}
                  type="button"
                  className={`${baseClass} device-card__linked-entity--icon`}
                  onClick={() => onToggle(entity)}
                  disabled={disabled}
                  aria-label={`${friendlyName}: ${stateLabel}`}
                >
                  {iconContent}
                </button>
              );
            }
            return (
              <div
                key={entity.entity_id}
                className={`${baseClass} device-card__linked-entity--icon device-card__linked-entity--static`}
                aria-label={`${friendlyName}: ${stateLabel}`}
              >
                {iconContent}
              </div>
            );
          }

          if (onToggle) {
            return (
              <button
                key={entity.entity_id}
                type="button"
                className={baseClass}
                onClick={() => onToggle(entity)}
                disabled={disabled}
              >
                <span className="device-card__linked-info">
                  <span className="device-card__linked-name">{friendlyName}</span>
                  {!hideDescription && <span className="device-card__linked-description">{helperText}</span>}
                </span>
                {!hideState && <span className="device-card__linked-state">{stateLabel}</span>}
              </button>
            );
          }
          return (
            <div key={entity.entity_id} className={`${baseClass} device-card__linked-entity--static`}>
              <span className="device-card__linked-info">
                <span className="device-card__linked-name">{friendlyName}</span>
                {!hideDescription && <span className="device-card__linked-description">{helperText}</span>}
              </span>
              {!hideState && <span className="device-card__linked-state">{stateLabel}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

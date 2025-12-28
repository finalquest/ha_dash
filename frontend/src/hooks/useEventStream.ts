import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { HaEntity } from '../api/types';

interface StateChangedPayload {
  type: 'state_changed';
  entity_id: string;
  new_state: HaEntity;
}

interface StatusPayload {
  type: 'status';
  online: boolean;
}

interface SceneTriggeredPayload {
  type: 'scene_triggered';
  entityIds: string[];
  timestamp: string;
}

type EventPayload = StateChangedPayload | StatusPayload | SceneTriggeredPayload;

export const useEventStream = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as EventPayload;
        if (payload.type === 'state_changed' && payload.new_state) {
          queryClient.setQueryData<HaEntity[]>(['entities'], (current) => {
            if (!current) return current;
            return current.map((entity) => {
              if (entity.entity_id !== payload.entity_id) {
                return entity;
              }
              const nextState = payload.new_state as HaEntity;
              return {
                ...entity,
                state: nextState.state,
                last_changed: nextState.last_changed,
                last_updated: nextState.last_updated,
                attributes: {
                  ...entity.attributes,
                  ...(nextState.attributes ?? {}),
                },
              };
            });
          });
        } else if (payload.type === 'scene_triggered' && payload.entityIds?.length) {
          queryClient.setQueryData<HaEntity[]>(['entities'], (current) => {
            if (!current) return current;
            return current.map((entity) => {
              if (!payload.entityIds.includes(entity.entity_id)) {
                return entity;
              }
              return {
                ...entity,
                attributes: {
                  ...entity.attributes,
                  __ha_dash_last_triggered: payload.timestamp,
                },
              };
            });
          });
        }
      } catch (error) {
        // ignore malformed event
      }
    };

    eventSource.addEventListener('message', handleMessage);

    return () => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }, [queryClient]);
};

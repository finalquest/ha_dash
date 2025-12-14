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

type EventPayload = StateChangedPayload | StatusPayload;

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
            return current.map((entity) =>
              entity.entity_id === payload.entity_id ? (payload.new_state as HaEntity) : entity,
            );
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

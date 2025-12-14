import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLight } from '../api/client';

export const useLightControl = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => toggleLight(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
};

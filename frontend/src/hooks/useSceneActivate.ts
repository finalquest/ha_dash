import { useMutation } from '@tanstack/react-query';
import { activateScene } from '../api/client';

export const useSceneActivate = () => {
  return useMutation({
    mutationFn: (entityId: string) => activateScene(entityId),
  });
};

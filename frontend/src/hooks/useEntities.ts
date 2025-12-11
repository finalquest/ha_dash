import { useQuery } from '@tanstack/react-query';
import { fetchEntities } from '../api/client';

export const useEntities = () => {
  return useQuery({
    queryKey: ['entities'],
    queryFn: fetchEntities,
  });
};

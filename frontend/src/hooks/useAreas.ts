import { useQuery } from '@tanstack/react-query';
import { fetchAreas } from '../api/client';

export const useAreas = () => {
  return useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  });
};

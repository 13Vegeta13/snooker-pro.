import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getPlayer } from '@/services/players';
import type { Player } from '@/types';

export function useCurrentPlayer() {
  const { user, loading: authLoading } = useAuth();
  const linkedPlayerId = user?.linkedPlayerId || '';

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['player', linkedPlayerId],
    queryFn: () => getPlayer(linkedPlayerId as string),
    enabled: !!linkedPlayerId && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const loading = authLoading || isLoading || isFetching;
  const player = useMemo<Player | null>(() => (data ?? null), [data]);

  return { player, loading, error, refetch };
}

export default useCurrentPlayer;
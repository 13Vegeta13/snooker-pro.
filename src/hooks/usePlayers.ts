import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllPlayers, 
  getPlayer, 
  createPlayer, 
  updatePlayer, 
  deletePlayer,
  searchPlayers,
  getTopPlayersByElo,
  getTopPlayersByHighestBreak
} from '@/services/players';
import { Player } from '@/types';

export const usePlayers = () => {
  return useQuery({
    queryKey: ['players'],
    queryFn: getAllPlayers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePlayer = (playerId: string) => {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => getPlayer(playerId),
    enabled: !!playerId,
  });
};

export const useSearchPlayers = (searchTerm: string) => {
  return useQuery({
    queryKey: ['players', 'search', searchTerm],
    queryFn: () => searchPlayers(searchTerm),
    enabled: searchTerm.length > 2,
    staleTime: 2 * 60 * 1000,
  });
};

export const useTopPlayers = () => {
  const eloQuery = useQuery({
    queryKey: ['players', 'top-elo'],
    queryFn: () => getTopPlayersByElo(10),
    staleTime: 10 * 60 * 1000,
  });

  const breakQuery = useQuery({
    queryKey: ['players', 'top-breaks'],
    queryFn: () => getTopPlayersByHighestBreak(10),
    staleTime: 10 * 60 * 1000,
  });

  return {
    topByElo: eloQuery,
    topByBreak: breakQuery,
  };
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playerData, createdBy }: { 
      playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'stats'>;
      createdBy: string;
    }) => createPlayer(playerData, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      playerId, 
      updates, 
      updatedBy 
    }: { 
      playerId: string;
      updates: Partial<Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stats'>>;
      updatedBy: string;
    }) => updatePlayer(playerId, updates, updatedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['player', variables.playerId] });
    },
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};
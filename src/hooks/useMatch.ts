import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMatch,
  getLiveMatches,
  getRecentMatches,
  getMatchesByPlayer,
  createMatch,
  updateMatch,
  deleteMatch,
  applyMatchEvent,
  undoLastMatchEvent
} from '@/services/matches';
import { Match, MatchEventData } from '@/types';

export const useMatch = (matchId: string) => {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId),
    enabled: !!matchId,
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes pour le live
  });
};

export const useLiveMatches = () => {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: getLiveMatches,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
};

export const useRecentMatches = (limit: number = 10) => {
  return useQuery({
    queryKey: ['matches', 'recent', limit],
    queryFn: () => getRecentMatches(limit),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePlayerMatches = (playerId: string) => {
  return useQuery({
    queryKey: ['matches', 'player', playerId],
    queryFn: () => getMatchesByPlayer(playerId),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (opts: {
      p1: { id: string; name: string };
      p2: { id: string; name: string };
      format: { setsEnabled: boolean; bestOfSets: number; framesPerSet: number };
      venue?: string | null;
      referee?: string | null;
      createdBy: string;
    }) => createMatch(opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (error) => {
      console.error('Erreur création match:', error);
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, updates }: { 
      matchId: string; 
      updates: Partial<Match> 
    }) => updateMatch(matchId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useDeleteMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useApplyMatchEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, eventData }: { 
      matchId: string; 
      eventData: MatchEventData 
    }) => applyMatchEvent(matchId, eventData),
    onSuccess: (_, variables) => {
      // Rafraîchir immédiatement le match
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId] });
    },
  });
};

export const useUndoMatchEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, userId }: { 
      matchId: string; 
      userId: string 
    }) => undoLastMatchEvent(matchId, userId),
    onSuccess: (_, variables) => {
      // Rafraîchir immédiatement le match
      queryClient.invalidateQueries({ queryKey: ['match', variables.matchId] });
    },
  });
};
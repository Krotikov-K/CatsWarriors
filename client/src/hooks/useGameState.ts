import { useQuery } from "@tanstack/react-query";
import { type GameState } from "@shared/schema";

export function useGameState(userId: number | null) {
  const { data: gameState, isLoading, error } = useQuery<GameState>({
    queryKey: ['/api/game-state', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      const res = await fetch(`/api/game-state?userId=${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch game state');
      }
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: (data) => {
      // Refresh every 500ms if in combat, otherwise disabled  
      const inCombat = data?.isInCombat || data?.currentCombat;
      console.log('Refetch interval check:', { inCombat, hasCurrentCombat: !!data?.currentCombat });
      return inCombat ? 500 : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data
  });

  return {
    gameState,
    isLoading,
    error
  };
}

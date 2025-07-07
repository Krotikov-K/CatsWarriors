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
    refetchInterval: 5000,
    staleTime: 1000,
  });

  return {
    gameState,
    isLoading,
    error
  };
}

import { useQuery } from "@tanstack/react-query";
import { type GameState } from "@shared/schema";

export function useGameState(characterId: number | null) {
  const { data: gameState, isLoading, error } = useQuery<GameState>({
    queryKey: ['/api/game-state', characterId],
    queryFn: async () => {
      const res = await fetch(`/api/game-state/${characterId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch game state');
      }
      return res.json();
    },
    enabled: !!characterId,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 1000, // Consider data stale after 1 second
  });

  return {
    gameState,
    isLoading,
    error
  };
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGameState } from "@/hooks/useGameState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUser } from "@/hooks/useUser";
import CharacterPanel from "@/components/CharacterPanel";
import StatsPanel from "@/components/StatsPanel";
import GameMap from "@/components/GameMap";
import CombatModal from "@/components/CombatModal";
import NavigationMenu from "@/components/NavigationMenu";
import TopBar from "@/components/TopBar";
import { Skeleton } from "@/components/ui/skeleton";

export default function GameDashboard() {
  const [, navigate] = useLocation();
  const [currentCharacterId, setCurrentCharacterId] = useState<number | null>(null);
  const { user } = useUser();
  
  // Get user's characters
  const { data: characters = [], isLoading: charactersLoading } = useQuery({
    queryKey: ['/api/characters', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/characters?userId=${user?.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch characters');
      }
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (characters.length > 0 && !currentCharacterId) {
      // Use the first character by default
      setCurrentCharacterId(characters[0].id);
    } else if (characters.length === 0 && !charactersLoading && user) {
      // No characters found, redirect to character creation
      navigate("/create-character");
    }
  }, [characters, currentCharacterId, charactersLoading, user, navigate]);

  const { gameState, isLoading, error } = useGameState(currentCharacterId);
  const { isConnected, sendMessage } = useWebSocket(currentCharacterId);

  // Show loading while checking characters
  if (charactersLoading || !user) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-foreground text-xl">Загрузка...</div>
      </div>
    );
  }

  // If no characters, redirect is handled by useEffect above
  if (characters.length === 0) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-foreground text-xl">Перенаправление...</div>
      </div>
    );
  }

  if (!currentCharacterId) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-foreground text-xl">Загрузка персонажа...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80 bg-card border-r border-border p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-16 w-16 rounded-full mb-4" />
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-2 w-full mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !gameState?.character) {
    navigate("/create-character");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        {/* Game Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            🐱 Cats War
          </h1>
          <p className="text-sm text-muted-foreground">Мир Котов Воителей</p>
          <div className="flex items-center mt-2 text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-muted-foreground">
              {isConnected ? 'Подключен' : 'Отключен'}
            </span>
          </div>
        </div>

        <CharacterPanel character={gameState.character} />
        <StatsPanel character={gameState.character} />
        <NavigationMenu />

        {/* Telegram Bot Status */}
        <div className="p-4 border-t border-border-dark">
          <div className="flex items-center text-sm text-gray-400">
            <i className="fab fa-telegram text-blue-400 mr-2"></i>
            <span>Бот Telegram</span>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto"></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          location={gameState.location} 
          playersOnline={gameState.playersInLocation?.length || 0}
        />
        
        <GameMap
          location={gameState.location}
          character={gameState.character}
          playersInLocation={gameState.playersInLocation || []}
          activeCombats={gameState.activeCombats || []}
          onLocationChange={(locationId) => {
            sendMessage({
              type: 'move_character',
              data: { characterId: gameState.character!.id, locationId },
              timestamp: new Date().toISOString()
            });
          }}
        />
      </div>

      {/* Combat Modal */}
      {gameState.isInCombat && gameState.currentCombat && (
        <CombatModal
          combat={gameState.currentCombat}
          character={gameState.character}
          onClose={() => {
            // Handle combat close if needed
          }}
          onJoinCombat={(combatId) => {
            sendMessage({
              type: 'join_combat',
              data: { characterId: gameState.character!.id, combatId },
              timestamp: new Date().toISOString()
            });
          }}
        />
      )}
    </div>
  );
}

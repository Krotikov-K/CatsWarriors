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
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* Mobile Top Bar */}
      <div className="md:hidden">
        <TopBar 
          location={gameState.location} 
          playersOnline={gameState.playersInLocation?.length || 0}
        />
      </div>

      {/* Sidebar - Mobile: Horizontal scroll, Desktop: Fixed sidebar */}
      <div className="md:w-80 bg-card border-b md:border-r border-border flex md:flex-col overflow-x-auto md:overflow-y-auto flex-shrink-0">
        {/* Game Header - Desktop only */}
        <div className="hidden md:block p-6 border-b border-border">
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

        {/* Mobile: Horizontal panels, Desktop: Vertical panels */}
        <div className="flex md:flex-col w-full">
          <div className="flex-shrink-0 w-80 md:w-full">
            <CharacterPanel character={gameState.character} />
          </div>
          <div className="flex-shrink-0 w-80 md:w-full">
            <StatsPanel character={gameState.character} />
          </div>
          <div className="flex-shrink-0 w-80 md:w-full">
            <NavigationMenu />
          </div>
        </div>

        {/* Telegram Bot Status - Desktop only */}
        <div className="hidden md:block p-4 border-t border-border">
          <div className="flex items-center text-sm text-muted-foreground">
            <span>🤖 Telegram Bot</span>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto"></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Top Bar */}
        <div className="hidden md:block">
          <TopBar 
            location={gameState.location} 
            playersOnline={gameState.playersInLocation?.length || 0}
          />
        </div>
        
        <div className="flex-1 overflow-auto p-4 md:p-6">
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

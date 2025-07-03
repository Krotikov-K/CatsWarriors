import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGameState } from "@/hooks/useGameState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUser } from "@/hooks/useUser";
import CharacterPanel from "@/components/CharacterPanel";
import StatsPanel from "@/components/StatsPanel";
import MapView from "@/components/MapView";
import CombatModal from "@/components/CombatModal";
import NavigationMenu from "@/components/NavigationMenu";
import TopBar from "@/components/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Map, User, Sword, Home } from "lucide-react";

export default function GameDashboard() {
  const [, navigate] = useLocation();
  const [currentCharacterId, setCurrentCharacterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'combat' | 'profile'>('overview');
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="flex flex-col md:flex-row h-full">
            {/* Character Info */}
            <div className="md:w-80 bg-card border-b md:border-r border-border flex md:flex-col overflow-x-auto md:overflow-y-auto flex-shrink-0">
              <div className="flex md:flex-col w-full">
                <div className="flex-shrink-0 w-80 md:w-full">
                  <CharacterPanel character={gameState.character!} />
                </div>
                <div className="flex-shrink-0 w-80 md:w-full">
                  <StatsPanel character={gameState.character!} />
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 overflow-auto">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Обзор</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground mb-2">Текущая локация</h3>
                    <p className="text-muted-foreground">{gameState.location?.name || 'Неизвестно'}</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground mb-2">Игроки рядом</h3>
                    <p className="text-muted-foreground">{gameState.playersInLocation?.length || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Быстрые действия</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('map')}
                  >
                    <Map className="w-6 h-6 mb-1" />
                    <span className="text-xs">Карта</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('combat')}
                  >
                    <Sword className="w-6 h-6 mb-1" />
                    <span className="text-xs">Бой</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('profile')}
                  >
                    <User className="w-6 h-6 mb-1" />
                    <span className="text-xs">Профиль</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab('overview')}
                  >
                    <Home className="w-6 h-6 mb-1" />
                    <span className="text-xs">Лагерь</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'map':
        return (
          <div className="h-full p-4 md:p-6 overflow-auto">
            <MapView 
              location={gameState.location}
              character={gameState.character!}
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
        );
        
      case 'combat':
        return (
          <div className="h-full p-4 md:p-6 overflow-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Боевая система</h2>
            <p className="text-muted-foreground">Функционал боя будет добавлен позже</p>
          </div>
        );
        
      case 'profile':
        return (
          <div className="h-full p-4 md:p-6 overflow-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Профиль персонажа</h2>
            <CharacterPanel character={gameState.character!} />
            <StatsPanel character={gameState.character!} />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar with Tabs */}
      <div className="bg-card border-b border-border">
        <TopBar 
          location={gameState.location} 
          playersOnline={gameState.playersInLocation?.length || 0}
        />
        
        {/* Tab Navigation */}
        <div className="flex px-4 pb-3">
          <div className="flex space-x-1 bg-secondary rounded-lg p-1">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
              className="px-3 py-1.5"
            >
              <Home className="w-4 h-4 mr-1" />
              Обзор
            </Button>
            <Button
              variant={activeTab === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('map')}
              className="px-3 py-1.5"
            >
              <Map className="w-4 h-4 mr-1" />
              Карта
            </Button>
            <Button
              variant={activeTab === 'combat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('combat')}
              className="px-3 py-1.5"
            >
              <Sword className="w-4 h-4 mr-1" />
              Бой
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('profile')}
              className="px-3 py-1.5"
            >
              <User className="w-4 h-4 mr-1" />
              Профиль
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
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

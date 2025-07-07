import { useState, useEffect } from "react";
import { Home, Map, Sword, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/useGameState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUser } from "@/hooks/useUser";
import CharacterPanel from "@/components/CharacterPanel";
import StatsPanel from "@/components/StatsPanel";
import MapView from "@/components/MapView";
import CombatModal from "@/components/CombatModal";
import TopBar from "@/components/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Character, Combat } from "@shared/schema";

type TabType = 'overview' | 'map' | 'combat' | 'profile';

const navigate = (path: string) => {
  window.location.href = path;
};

export default function GameDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { gameState, isLoading, error } = useGameState(user?.id || null);
  const { sendMessage } = useWebSocket(gameState?.character?.id || null);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="bg-card border-b border-border p-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 flex">
          <div className="w-80 p-6">
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
          <div className="h-full p-4 md:p-6 overflow-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Лагерь {gameState.character?.clan === 'thunder' ? 'Грозового' : 'Речного'} племени
              </h2>
              <p className="text-muted-foreground">
                Добро пожаловать в лагерь! Здесь вы можете отдохнуть, встретить других игроков и получить задания.
              </p>
            </div>
            
            {/* Players in Location */}
            {gameState.playersInLocation && gameState.playersInLocation.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Игроки в локации ({gameState.playersInLocation.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {gameState.playersInLocation.map((player: Character) => (
                    <div key={player.id} className="bg-secondary p-3 rounded-lg flex items-center">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mr-3">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя • Ур. {player.level}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Location Description */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-2">О локации</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {gameState.location?.description || 'Описание локации отсутствует'}
              </p>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-4">Тип: {gameState.location?.type}</span>
                <span className="mr-4">Уровень опасности: {gameState.location?.dangerLevel || 'Низкий'}</span>
                <span>Макс. игроков: {gameState.location?.maxPlayers || 'Неограничено'}</span>
              </div>
            </div>
          </div>
        );
        
      case 'map':
        return (
          <div className="h-full overflow-auto">
            <MapView 
              location={gameState.location}
              character={gameState.character!}
              playersInLocation={gameState.playersInLocation || []}
              activeCombats={gameState.activeCombats || []}
              onLocationChange={(locationId) => {
                if (sendMessage) {
                  sendMessage({
                    type: 'move_character',
                    data: { characterId: gameState.character!.id, locationId },
                    timestamp: new Date().toISOString()
                  });
                }
              }}
            />
          </div>
        );
        
      case 'combat':
        return (
          <div className="h-full p-4 md:p-6 overflow-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Боевая система</h2>
              <p className="text-muted-foreground">
                Сражайтесь с другими игроками и NPC для получения опыта и наград
              </p>
            </div>
            
            <div className="bg-secondary p-6 rounded-lg text-center">
              <Sword className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Скоро будет доступно</h3>
              <p className="text-muted-foreground">
                Боевая система находится в разработке. Следите за обновлениями!
              </p>
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="h-full overflow-auto">
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
              
              {/* Profile Details */}
              <div className="flex-1 p-4 md:p-6 overflow-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">Профиль персонажа</h2>
                  <p className="text-muted-foreground">
                    Детальная информация о вашем персонаже и достижениях
                  </p>
                </div>
                
                {/* Character Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {gameState.character?.level}
                    </div>
                    <div className="text-sm text-muted-foreground">Уровень</div>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {gameState.character?.experience}
                    </div>
                    <div className="text-sm text-muted-foreground">Опыт</div>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {gameState.character?.currentHp}/{gameState.character?.maxHp}
                    </div>
                    <div className="text-sm text-muted-foreground">Здоровье</div>
                  </div>
                  <div className="bg-secondary p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {gameState.character?.clan === 'thunder' ? 'Грозовое' : 'Речное'}
                    </div>
                    <div className="text-sm text-muted-foreground">Племя</div>
                  </div>
                </div>
                
                {/* Character History */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">История персонажа</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-muted-foreground">Персонаж создан</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-muted-foreground">Присоединился к {gameState.character?.clan === 'thunder' ? 'Грозовому' : 'Речному'} племени</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-muted-foreground">Достиг {gameState.character?.level} уровня</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
          <div className="flex space-x-1 bg-secondary rounded-lg p-1 w-full md:w-auto">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
              className="flex-1 md:flex-none px-3 py-1.5"
            >
              <Home className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Обзор</span>
            </Button>
            <Button
              variant={activeTab === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('map')}
              className="flex-1 md:flex-none px-3 py-1.5"
            >
              <Map className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Карта</span>
            </Button>
            <Button
              variant={activeTab === 'combat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('combat')}
              className="flex-1 md:flex-none px-3 py-1.5"
            >
              <Sword className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Бой</span>
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('profile')}
              className="flex-1 md:flex-none px-3 py-1.5"
            >
              <User className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Профиль</span>
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
            if (sendMessage) {
              sendMessage({
                type: 'join_combat',
                data: { characterId: gameState.character!.id, combatId },
                timestamp: new Date().toISOString()
              });
            }
          }}
        />
      )}
    </div>
  );
}
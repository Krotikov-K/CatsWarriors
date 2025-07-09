import { useState, useEffect } from "react";
import { Home, Map, Sword, User } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/useGameState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useUser } from "@/hooks/useUser";
import CharacterPanel from "@/components/CharacterPanel";
import StatsPanel from "@/components/StatsPanel";
import MapView from "@/components/MapView";
import CombatModal from "@/components/CombatModal";
import CombatInterface from "@/components/CombatInterface";
import CombatResultModal from "@/components/CombatResultModal";
import TopBar from "@/components/TopBar";
import NPCPanel from "@/components/NPCPanel";
import GroupPanel from "@/components/GroupPanel";
import CampActions from "@/components/CampActions";

import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Character, Combat } from "@shared/schema";

type TabType = 'overview' | 'map' | 'combat' | 'profile';

export default function GameDashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { gameState, isLoading: gameLoading, error } = useGameState(user?.id || null);
  const { sendMessage } = useWebSocket(gameState?.character?.id || null);

  const [selectedCombat, setSelectedCombat] = useState<Combat | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [combatResult, setCombatResult] = useState<any>(null);
  const [showCombatResult, setShowCombatResult] = useState(false);
  const [wasInCombat, setWasInCombat] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Track combat end and show results
  useEffect(() => {
    if (gameState) {
      const isCurrentlyInCombat = gameState.isInCombat || !!gameState.currentCombat;
      
      // If we were in combat but no longer are, show results
      if (wasInCombat && !isCurrentlyInCombat && gameState.lastCompletedCombat) {
        const combat = gameState.lastCompletedCombat;
        const characterId = gameState.character?.id;
        
        // Calculate damage dealt and taken from combat log
        let damageDealt = 0;
        let damageTaken = 0;
        let enemyName = "Противник";
        
        if (combat.combatLog) {
          combat.combatLog.forEach(entry => {
            if (entry.type === "damage") {
              if (entry.actorId === characterId) {
                damageDealt += entry.damage || 0;
              } else if (entry.targetId === characterId) {
                damageTaken += entry.damage || 0;
              }
            }
          });
          
          // Find enemy name from first attack entry
          const firstAttack = combat.combatLog.find(entry => 
            entry.type === "attack" && entry.actorId !== characterId
          );
          if (firstAttack && firstAttack.message) {
            const match = firstAttack.message.match(/^([^а-я]+)\s/);
            if (match) {
              enemyName = match[1].trim();
            }
          }
        }
        
        const result = {
          victory: (gameState.character?.currentHp || 0) > 0,
          experienceGained: combat.combatLog?.length || 5, // XP based on combat length
          damageDealt,
          damageTaken,
          enemyName,
          survivedTurns: combat.currentTurn || 1
        };
        
        setCombatResult(result);
        setShowCombatResult(true);
        setWasInCombat(false);
      } else if (isCurrentlyInCombat && !wasInCombat) {
        setWasInCombat(true);
      }
    }
  }, [gameState, wasInCombat]);

  const moveCharacterMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const response = await apiRequest("POST", "/api/move", {
        characterId: gameState?.character?.id,
        locationId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Перемещение",
        description: "Вы успешно переместились в новую локацию.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка перемещения",
        description: error.message || "Не удалось переместиться",
        variant: "destructive",
      });
    },
  });

  const attackNPCMutation = useMutation({
    mutationFn: async ({ npcId, asGroup }: { npcId: number; asGroup?: boolean }) => {
      const response = await apiRequest("POST", "/api/combat/start", {
        characterId: gameState?.character?.id,
        npcId: npcId,
        locationId: gameState?.character?.currentLocationId,
        asGroup: asGroup || false
      });
      return response.json();
    },
    onSuccess: () => {
      // Immediately switch to combat tab and start aggressive polling
      setActiveTab('combat');
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      
      // Start aggressive polling for combat updates
      const pollInterval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      }, 500); // Poll every 500ms during combat
      
      // Stop polling after 30 seconds (combat should be done by then)
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 30000);
      
      toast({
        title: "Бой начался!",
        description: "Вы вступили в бой с противником.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка боя",
        description: error.message || "Не удалось начать бой",
        variant: "destructive",
      });
    },
  });

  const joinCombatMutation = useMutation({
    mutationFn: async (combatId: number) => {
      const response = await apiRequest("POST", "/api/combat/join", {
        characterId: gameState?.character?.id,
        combatId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Присоединились к бою!",
        description: "Вы вступили в активный бой.",
      });
      setShowCombatModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка присоединения",
        description: error.message || "Не удалось присоединиться к бою",
        variant: "destructive",
      });
    },
  });

  const handleLocationChange = (locationId: number) => {
    if (gameState?.character?.currentLocationId !== locationId) {
      moveCharacterMutation.mutate(locationId);
    }
  };

  const handleAttackNPC = (npcId: number) => {
    attackNPCMutation.mutate(npcId);
  };

  const handleCombatClick = (combat: Combat) => {
    setSelectedCombat(combat);
    setShowCombatModal(true);
  };

  const handleJoinCombat = (combatId: number) => {
    joinCombatMutation.mutate(combatId);
  };

  if (userLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Cats War</h1>
          <p className="text-muted-foreground mb-6">
            Загружаем игру...
          </p>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
          <p className="text-red-500 mb-6">
            Не удалось загрузить игровые данные
          </p>
          <Button onClick={() => navigate("/create-character")}>
            Создать персонажа
          </Button>
        </div>
      </div>
    );
  }

  if (!gameState?.character) {
    navigate("/create-character");
    return null;
  }

  const character = gameState.character;
  const location = gameState.location;
  const playersInLocation = gameState.playersInLocation || [];
  const npcsInLocation = gameState.npcsInLocation || [];
  const activeCombats = gameState.activeCombats || [];
  const playersOnline = playersInLocation.length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-4 space-y-6 pb-20">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-xl font-bold mb-2">
                {location?.name || 'Неизвестная локация'}
              </h2>
              <p className="text-muted-foreground mb-3">
                {location?.description || 'Описание локации отсутствует'}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-accent px-2 py-1 rounded">
                  Уровень опасности: {location?.dangerLevel || 1}
                </span>
                <span className="text-muted-foreground">
                  Игроков онлайн: {playersOnline}
                </span>
              </div>
            </div>
            
            <GroupPanel gameState={gameState} />
            
            {location && character && location.type === "camp" && (
              <CampActions character={character} location={location} />
            )}
            
            {npcsInLocation.length > 0 && (
              <NPCPanel 
                npcs={npcsInLocation}
                onAttackNPC={(npcId, asGroup) => attackNPCMutation.mutate({ npcId, asGroup })}
                canAttack={!gameState.isInCombat}
                character={character}
                currentGroup={gameState.currentGroup}
              />
            )}

            {activeCombats.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Активные бои</h3>
                <div className="space-y-2">
                  {activeCombats.map((combat) => (
                    <div
                      key={combat.id}
                      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleCombatClick(combat)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Бой #{combat.id}</span>
                        <span className="text-sm text-muted-foreground">
                          {combat.participants.length} участников
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playersInLocation.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Игроки в локации</h3>
                <div className="space-y-2">
                  {playersInLocation.filter(p => p.id !== character.id).map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'map':
        return (
          <div className="h-full pb-16">
            <MapView
              location={location}
              character={character}
              playersInLocation={playersInLocation}
              activeCombats={activeCombats}
              onLocationChange={handleLocationChange}
            />
          </div>
        );

      case 'combat':
        return (
          <div className="p-4 space-y-6 pb-20">
            {gameState.isInCombat && gameState.currentCombat ? (
              <CombatInterface
                combat={gameState.currentCombat}
                character={character}
                npcsInLocation={npcsInLocation}
                playersInLocation={playersInLocation}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Вы не участвуете в бою</p>
                <p className="text-sm text-muted-foreground">
                  Найдите NPC противников в локациях для охоты или присоединитесь к активному бою
                </p>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="p-4 space-y-6 pb-20">
            <CharacterPanel character={character} />
            <StatsPanel character={character} />
          </div>
        );



      default:
        return (
          <div className="h-full p-4 flex items-center justify-center pb-16">
            <p className="text-muted-foreground">Раздел в разработке</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar location={location} playersOnline={playersOnline} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'overview'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Обзор</span>
          </button>
          
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'map'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Карта</span>
          </button>
          
          <button
            onClick={() => setActiveTab('combat')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'combat'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sword className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Бой</span>
          </button>
          

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'profile'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Профиль</span>
          </button>
        </div>
      </div>

      {/* Combat Modal */}
      {showCombatModal && selectedCombat && (
        <CombatModal
          combat={selectedCombat}
          character={character}
          onClose={() => setShowCombatModal(false)}
          onJoinCombat={handleJoinCombat}
        />
      )}

      {/* Combat Result Modal */}
      <CombatResultModal
        isOpen={showCombatResult}
        onClose={() => setShowCombatResult(false)}
        result={combatResult}
      />
    </div>
  );
}
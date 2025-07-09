import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/useGameState";
import { useUser } from "@/hooks/useUser";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Home, Map, Swords, User } from "lucide-react";
import { navigate } from "wouter/use-browser-location";

// Import all game components
import { LevelUpModal } from "@/components/LevelUpModal";
import CharacterPanel from "@/components/CharacterPanel";
import StatsPanel from "@/components/StatsPanel";
import NPCPanel from "@/components/NPCPanel";
import MapView from "@/components/MapView";
import CombatInterface from "@/components/CombatInterface";
import GroupPanel from "@/components/GroupPanel";
import CampActions from "@/components/CampActions";
import TopBar from "@/components/TopBar";
import CombatModal from "@/components/CombatModal";
import CombatResultModal from "@/components/CombatResultModal";

import type { Combat } from "@shared/schema";

export default function GameDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { gameState, isLoading: gameLoading, error } = useGameState(user?.id || null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCombat, setSelectedCombat] = useState<Combat | null>(null);
  const [showCombatModal, setShowCombatModal] = useState(false);
  
  // Level up tracking
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  // Combat result tracking
  const [combatResult, setCombatResult] = useState<any>(null);
  const [showCombatResult, setShowCombatResult] = useState(false);
  const [wasInCombat, setWasInCombat] = useState(false);

  // Track level ups and unspent stat points
  useEffect(() => {
    if (gameState?.character) {
      const currentLevel = gameState.character.level;
      const unspentPoints = gameState.character.unspentStatPoints || 0;
      
      // Show level up modal if character has unspent stat points
      if (unspentPoints > 0 && !showLevelUp) {
        console.log('*** UNSPENT STAT POINTS DETECTED ***', {
          character: gameState.character.name,
          level: currentLevel,
          unspentPoints: unspentPoints
        });
        
        setLevelUpData({
          characterName: gameState.character.name,
          newLevel: currentLevel,
          baseStats: {
            strength: gameState.character.strength,
            agility: gameState.character.agility,
            intelligence: gameState.character.intelligence,
            endurance: gameState.character.endurance,
            maxHp: gameState.character.maxHp
          }
        });
        setShowLevelUp(true);
      }
      
      // Also detect fresh level ups
      if (previousLevel !== null && currentLevel > previousLevel) {
        console.log('*** LEVEL UP DETECTED ***', {
          from: previousLevel,
          to: currentLevel,
          character: gameState.character.name
        });
        
        setLevelUpData({
          characterName: gameState.character.name,
          newLevel: currentLevel,
          baseStats: {
            strength: gameState.character.strength,
            agility: gameState.character.agility,
            intelligence: gameState.character.intelligence,
            endurance: gameState.character.endurance,
            maxHp: gameState.character.maxHp
          }
        });
        setShowLevelUp(true);
      }
      
      setPreviousLevel(currentLevel);
    }
  }, [gameState?.character?.level, gameState?.character?.unspentStatPoints, previousLevel, showLevelUp]);

  // Track combat completion for results
  useEffect(() => {
    const isCurrentlyInCombat = gameState?.isInCombat;
    
    if (wasInCombat && !isCurrentlyInCombat) {
      console.log('*** COMBAT ENDED ***');
      // Combat just ended, check for last completed combat
      const lastCombat = gameState?.lastCompletedCombat;
      
      if (lastCombat && lastCombat.combatLog && Array.isArray(lastCombat.combatLog)) {
        let result = {
          victory: false,
          experienceGained: 0,
          damageDealt: 0,
          damageTaken: 0,
          enemyName: "Противник",
          survivedTurns: 1
        };
        
        let experienceGained = 0;
        let damageDealt = 0;
        let damageTaken = 0;
        let enemyName = "Противник";
        
        lastCombat.combatLog.forEach((entry: any) => {
          if (entry.type === "damage") {
            if (entry.actorId === gameState.character?.id) {
              damageDealt += entry.damage || 0;
            } else if (entry.targetId === gameState.character?.id) {
              damageTaken += entry.damage || 0;
            }
          }
          
          if (entry.message.includes("атакует") && !entry.message.includes(gameState.character?.name)) {
            const nameMatch = entry.message.match(/^([^]+?)\s+атакует/);
            if (nameMatch) {
              enemyName = nameMatch[1];
            }
          }
          
          if (entry.message.includes("получает") && entry.message.includes("опыта")) {
            const expMatch = entry.message.match(/(\d+)\s+опыта/);
            if (expMatch) {
              experienceGained += parseInt(expMatch[1]);
            }
          }
        });
        
        const isVictory = (gameState.character?.currentHp || 0) > 0;
        result = {
          victory: isVictory,
          experienceGained: isVictory ? (experienceGained || 0) : 0,
          damageDealt,
          damageTaken,
          enemyName,
          survivedTurns: lastCombat.currentTurn || 1
        };
        
        setCombatResult(result);
        setShowCombatResult(true);
        setWasInCombat(false);
      }
    } else if (isCurrentlyInCombat && !wasInCombat) {
      console.log('*** COMBAT STARTED ***');
      setWasInCombat(true);
      setActiveTab('combat'); // Auto-switch to combat tab
    }
  }, [gameState?.isInCombat, gameState?.currentCombat?.id]);

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
      setActiveTab('combat');
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
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

  const applyLevelUpMutation = useMutation({
    mutationFn: async (statBoosts: { strength: number; agility: number; intelligence: number; endurance: number }) => {
      const response = await apiRequest("POST", "/api/character/apply-level-up", { 
        statBoosts,
        userId: gameState?.character?.userId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({ 
        title: "Уровень повышен!", 
        description: "Характеристики персонажа улучшены" 
      });
      setShowLevelUp(false);
      setLevelUpData(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка повышения уровня", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleLocationChange = (locationId: number) => {
    if (gameState?.character?.currentLocationId !== locationId) {
      moveCharacterMutation.mutate(locationId);
    }
  };

  const handleAttackNPC = (npcId: number, asGroup?: boolean) => {
    attackNPCMutation.mutate({ npcId, asGroup });
  };

  const handleCombatClick = (combat: Combat) => {
    setSelectedCombat(combat);
    setShowCombatModal(true);
  };

  const handleJoinCombat = (combatId: number) => {
    joinCombatMutation.mutate(combatId);
  };

  const handleLevelUpClose = (statBoosts?: { strength: number; agility: number; intelligence: number; endurance: number }) => {
    if (statBoosts) {
      applyLevelUpMutation.mutate(statBoosts);
    } else {
      setShowLevelUp(false);
      setLevelUpData(null);
    }
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
          <button 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
            onClick={() => navigate("/create-character")}
          >
            Создать персонажа
          </button>
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
                onAttackNPC={handleAttackNPC}
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
                          {player.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя • Уровень {player.level}
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
            <Swords className="w-5 h-5 mb-1" />
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

      {/* Modals */}
      {showCombatModal && selectedCombat && (
        <CombatModal
          combat={selectedCombat}
          character={character}
          npcsInLocation={npcsInLocation}
          playersInLocation={playersInLocation}
          onClose={() => setShowCombatModal(false)}
          onJoin={handleJoinCombat}
        />
      )}

      {showCombatResult && combatResult && (
        <CombatResultModal
          isOpen={showCombatResult}
          onClose={() => setShowCombatResult(false)}
          result={combatResult}
        />
      )}

      {showLevelUp && levelUpData && (
        <LevelUpModal
          isOpen={showLevelUp}
          onClose={handleLevelUpClose}
          characterName={levelUpData.characterName}
          newLevel={levelUpData.newLevel}
          baseStats={levelUpData.baseStats}
        />
      )}
    </div>
  );
}
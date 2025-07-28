import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useGameState } from "@/hooks/useGameState";
import { useUser } from "@/hooks/useUser";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Home, Map, MessageCircle, User, Crown, Users, Shield } from "lucide-react";
import { ChatPanel } from '@/components/ChatPanel';
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
import RankManagement from "@/components/RankManagement";
import TribeManagement from "@/components/TribeManagement";
import TribeMembers from "@/components/TribeMembers";
import PvPPanel from "@/components/PvPPanel";
import DiplomacyPanel from "@/components/DiplomacyPanel";
import TerritoryWarPanel from "@/components/TerritoryWarPanel";
import TerritoryBattleModal from "@/components/TerritoryBattleModal";
import OverviewPanel from "@/components/OverviewPanel";

import type { Combat } from "@shared/schema";
import { RANKS } from "@shared/schema";

export default function GameDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { gameState, isLoading: gameLoading, error } = useGameState(user?.id || null);
  
  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(gameState?.character?.id || null);
  
  console.log('GameDashboard render:', { user, userLoading, gameState, gameLoading, error });
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [tribeSectionTab, setTribeSectionTab] = useState('members');
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
  const [lastProcessedCombatId, setLastProcessedCombatId] = useState<number | null>(null);

  // Territory battle tracking
  const [showTerritoryBattle, setShowTerritoryBattle] = useState(false);
  const [activeTerritoryBattle, setActiveTerritoryBattle] = useState<any>(null);

  // Check for any active territory combats that this character is participating in
  const { data: battleCombats } = useQuery({
    queryKey: ['/api/territory/active-combats', gameState?.character?.id],
    queryFn: async () => {
      if (!gameState?.character?.id) return [];
      // Check multiple battle IDs to find any active combat
      const responses = await Promise.all([
        fetch(`/api/territory/combat/14`).then(r => r.json()).catch(() => null),
        fetch(`/api/territory/combat/15`).then(r => r.json()).catch(() => null),
        fetch(`/api/territory/combat/16`).then(r => r.json()).catch(() => null),
        fetch(`/api/territory/combat/17`).then(r => r.json()).catch(() => null),
        fetch(`/api/territory/combat/18`).then(r => r.json()).catch(() => null),
      ]);
      return responses.filter(combat => 
        combat && 
        combat.status === 'active' && 
        combat.participants.includes(gameState.character.id)
      );
    },
    enabled: !!gameState?.character?.id,
    refetchInterval: 3000,
  });

  // Track level ups and unspent stat points
  useEffect(() => {
    if (gameState?.character) {
      const currentLevel = gameState.character.level;
      const unspentPoints = gameState.character.unspentStatPoints || 0;
      
      // Show level up modal if character has unspent stat points, but prevent duplicate modals
      if (unspentPoints > 0 && !showLevelUp && (!levelUpData || levelUpData.newLevel !== currentLevel)) {
        console.log('*** UNSPENT STAT POINTS DETECTED ***', {
          character: gameState.character.name,
          level: currentLevel,
          unspentPoints: unspentPoints,
          previousLevelUpLevel: levelUpData?.newLevel
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
      
      // Also detect fresh level ups - but only if no unspent points modal is already shown
      if (previousLevel !== null && currentLevel > previousLevel && unspentPoints === 0 && !showLevelUp) {
        console.log('*** FRESH LEVEL UP DETECTED (no stat points to distribute) ***', {
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

  // Auto-show territory battle interface when character is in active combat
  useEffect(() => {
    if (battleCombats && battleCombats.length > 0 && !showTerritoryBattle) {
      const activeCombat = battleCombats[0];
      console.log('*** TERRITORY BATTLE COMBAT DETECTED ***', activeCombat);
      
      // Set the active battle data to show the modal
      setActiveTerritoryBattle({
        id: activeCombat.territoryBattleId,
        status: 'active',
        locationId: activeCombat.locationId,
        participants: activeCombat.participants
      });
      setShowTerritoryBattle(true);
    }
    
    // Hide territory battle interface when no active combats
    if ((!battleCombats || battleCombats.length === 0) && showTerritoryBattle) {
      setShowTerritoryBattle(false);
      setActiveTerritoryBattle(null);
    }
  }, [battleCombats, showTerritoryBattle]);

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      console.log('WebSocket message received:', lastMessage);
      
      if (lastMessage.type === 'group_victory') {
        toast({
          title: "🎉 Групповая победа!",
          description: lastMessage.data.message,
          duration: 5000,
        });
        // Refresh game state to get updated experience
        queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      }
      
      if (lastMessage.type === 'combat_update') {
        // Refresh combat data
        queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      }
      
      if (lastMessage.type === 'territory_captured') {
        const { location, capturedBy, clan } = lastMessage.data;
        const clanName = clan === 'thunder' ? 'Грозовое племя' : 'Речное племя';
        const clanEmoji = clan === 'thunder' ? '⚡' : '🌊';
        
        toast({
          title: `${clanEmoji} Территория захвачена!`,
          description: `${capturedBy} захватил ${location} для ${clanName}`,
          duration: 5000,
        });
        
        // Refresh territory ownership data and game state
        queryClient.invalidateQueries({ queryKey: ['/api/territory/ownership'] });
        queryClient.invalidateQueries({ queryKey: ['/api/territory/influence'] });
        queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      }
      
      if (lastMessage.type === 'territory_battle_declared') {
        const { location, declaredBy } = lastMessage.data;
        
        toast({
          title: "⚔️ Битва объявлена!",
          description: `${declaredBy} объявил битву за ${location}`,
          duration: 5000,
        });
        
        // Refresh battle data
        queryClient.invalidateQueries({ queryKey: ['/api/territory/battles'] });
      }
    }
  }, [lastMessage, toast, queryClient]);

  // Track combat completion for results
  useEffect(() => {
    const isCurrentlyInCombat = gameState?.isInCombat;
    const lastCombat = gameState?.lastCompletedCombat;
    
    // Only show results if we have a new completed combat that we haven't processed yet
    if (lastCombat && 
        lastCombat.combatLog && 
        !isCurrentlyInCombat && 
        !showCombatResult && 
        lastCombat.id !== lastProcessedCombatId) {
      
      console.log('*** NEW COMPLETED COMBAT FOUND - SHOWING RESULTS ***', {
        combatId: lastCombat.id,
        lastProcessed: lastProcessedCombatId
      });
      
      let experienceGained = 0;
      let damageDealt = 0;
      let damageTaken = 0;
      let enemyName = "Противник";
      
      // Parse combat log for statistics
      lastCombat.combatLog.forEach((entry: any) => {
        if (entry.type === "attack" && entry.damage) {
          if (entry.actorId === gameState?.character?.id) {
            damageDealt += entry.damage || 0;
          } else if (entry.targetId === gameState?.character?.id) {
            damageTaken += entry.damage || 0;
          }
        }
        
        if (entry.message.includes("атакует") && !entry.message.includes(gameState?.character?.name)) {
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
      
      // For PvP, victory requires more than 1 HP (since 1 HP means defeat)
      const currentHp = gameState?.character?.currentHp || 0;
      const isVictory = lastCombat.type === "pvp" ? currentHp > 1 : currentHp > 0;
      const result = {
        victory: isVictory,
        experienceGained: isVictory ? (experienceGained || 0) : 0,
        damageDealt,
        damageTaken,
        enemyName,
        survivedTurns: lastCombat.currentTurn || 1
      };
      
      console.log('Showing combat result:', result);
      setCombatResult(result);
      setShowCombatResult(true);
      setLastProcessedCombatId(lastCombat.id); // Mark this combat as processed
    }
    
    // Track combat state changes for UI
    if (isCurrentlyInCombat && !wasInCombat) {
      console.log('*** COMBAT STARTED ***');
      setWasInCombat(true);
      setActiveTab('combat');
    } else if (!isCurrentlyInCombat && wasInCombat) {
      console.log('*** COMBAT ENDED ***');
      setWasInCombat(false);
    }
  }, [gameState?.isInCombat, gameState?.lastCompletedCombat, showCombatResult]);

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
          <h1 className="text-2xl font-bold mb-4">Клыки и Клятвы</h1>
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Добро пожаловать в Клыки и Клятвы!</h1>
          <p className="text-muted-foreground mb-6">
            У вас пока нет персонажа. Создайте своего воина-кота.
          </p>
          <button 
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-medium"
            onClick={() => navigate("/create-character")}
          >
            Создать персонажа
          </button>
        </div>
      </div>
    );
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
          <div className="p-4 pb-20">
            <OverviewPanel 
              character={character}
              location={location}
              playersInLocation={playersInLocation}
              activeCombats={activeCombats}
              npcsInLocation={npcsInLocation}
            />
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

      case 'chat':
        return (
          <div className="p-4 pb-20 h-full">
            <ChatPanel gameState={gameState} />
          </div>
        );

      case 'tribe':
        const canManage = ['leader', 'deputy', 'senior_healer', 'senior_warrior'].includes(character.rank);
        
        return (
          <div className="p-4 space-y-6 pb-20">
            {/* Tribe section header */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="h-6 w-6 text-yellow-500" />
                <h2 className="text-xl font-bold">
                  {character.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя
                </h2>
              </div>
              
              {/* Character's current rank */}
              <div className="bg-accent/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{RANKS[character.rank as keyof typeof RANKS]?.emoji}</span>
                  <span className="font-semibold">{character.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Должность: {RANKS[character.rank as keyof typeof RANKS]?.name}
                </p>
              </div>
            </div>

            {/* Tribe sub-navigation */}
            <div className="bg-card border border-border rounded-lg">
              <div className="flex border-b border-border">
                {canManage && (
                  <button
                    onClick={() => setTribeSectionTab('management')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                      tribeSectionTab === 'management'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Управление
                  </button>
                )}
                <button
                  onClick={() => setTribeSectionTab('members')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    tribeSectionTab === 'members'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Члены племени
                </button>
                <button
                  onClick={() => setTribeSectionTab('diplomacy')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    tribeSectionTab === 'diplomacy'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Дипломатия
                </button>
              </div>

              {/* Tribe section content */}
              <div className="p-4">
                {tribeSectionTab === 'management' && canManage && (
                  <TribeManagement character={character} />
                )}
                {tribeSectionTab === 'members' && (
                  <TribeMembers character={character} />
                )}
                {tribeSectionTab === 'diplomacy' && (
                  <DiplomacyPanel character={character} />
                )}
              </div>
            </div>
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
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'chat'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Чат</span>
          </button>
          
          <button
            onClick={() => setActiveTab('tribe')}
            className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
              activeTab === 'tribe'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Crown className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Племя</span>
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
          onClose={() => {
            console.log('*** CLOSING COMBAT RESULT MODAL ***');
            setShowCombatResult(false);
            setCombatResult(null);
            
            // Clear combat results on server (fire and forget)
            if (gameState?.character?.id) {
              apiRequest("POST", "/api/combat/clear-results", {
                characterId: gameState.character.id
              }).catch(error => {
                console.error("Failed to clear combat results:", error);
              });
            }
          }}
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

      {/* Territory Battle Modal */}
      {showTerritoryBattle && activeTerritoryBattle && gameState?.character && (
        <TerritoryBattleModal
          battle={activeTerritoryBattle}
          isOpen={showTerritoryBattle}
          onClose={() => {
            setShowTerritoryBattle(false);
            setActiveTerritoryBattle(null);
          }}
          currentCharacter={gameState.character}
        />
      )}
    </div>
  );
}
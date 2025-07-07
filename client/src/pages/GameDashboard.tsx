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
import TopBar from "@/components/TopBar";
import NPCPanel from "@/components/NPCPanel";
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

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

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
    mutationFn: async (npcId: number) => {
      const response = await apiRequest("POST", "/api/combat/start", {
        characterId: gameState?.character?.id,
        targetId: npcId,
        targetType: "npc"
      });
      return response.json();
    },
    onSuccess: () => {
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
          <div className="h-full p-4 md:p-6 overflow-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Лагерь {character.clan === 'thunder' ? 'Грозового' : 'Речного'} племени
              </h2>
              <p className="text-muted-foreground">
                Добро пожаловать в мир Котов-Воителей! Исследуйте территории, сражайтесь с врагами и развивайте своего персонажа.
              </p>
            </div>
            
            {npcsInLocation.length > 0 && (
              <NPCPanel 
                npcs={npcsInLocation}
                onAttackNPC={handleAttackNPC}
                canAttack={!gameState.isInCombat}
              />
            )}

            {activeCombats.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Активные бои</h3>
                <div className="space-y-2">
                  {activeCombats.map((combat) => (
                    <div
                      key={combat.id}
                      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
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
          </div>
        );

      case 'map':
        return (
          <div className="h-full">
            <MapView
              location={location}
              character={character}
              playersInLocation={playersInLocation}
              activeCombats={activeCombats}
              onLocationChange={handleLocationChange}
            />
          </div>
        );

      default:
        return (
          <div className="h-full p-4 md:p-6 flex items-center justify-center">
            <p className="text-muted-foreground">Раздел в разработке</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar location={location} playersOnline={playersOnline} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <CharacterPanel character={character} />
          </div>
          
          <div className="p-4 border-b border-border">
            <StatsPanel character={character} />
          </div>
          
          <div className="flex-1 p-4">
            <h3 className="font-semibold mb-3">Игроки в локации</h3>
            <div className="space-y-2">
              {playersInLocation.map((player) => (
                <div key={player.id} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Tab Navigation */}
          <div className="border-b border-border bg-card">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Home className="w-4 h-4" />
                Обзор
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'map'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Map className="w-4 h-4" />
                Карта
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {renderTabContent()}
          </div>
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
    </div>
  );
}
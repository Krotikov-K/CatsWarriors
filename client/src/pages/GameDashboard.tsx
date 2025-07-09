import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameState } from "@/hooks/useGameState";
import { useUser } from "@/hooks/useUser";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LevelUpModal } from "@/components/LevelUpModal";

export default function GameDashboard() {
  console.log('GameDashboard rendering...');
  
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('User:', user, 'Loading:', userLoading);
  
  const { gameState, isLoading: gameLoading, error } = useGameState(user?.id || null);
  
  // Level up tracking
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Track level ups
  useEffect(() => {
    if (gameState?.character) {
      const currentLevel = gameState.character.level;
      
      if (previousLevel !== null && currentLevel > previousLevel) {
        console.log('*** LEVEL UP DETECTED ***', {
          from: previousLevel,
          to: currentLevel,
          character: gameState.character.name
        });
        
        // Show level up modal with current stats as base
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
  }, [gameState?.character?.level, previousLevel]);

  const applyLevelUpMutation = useMutation({
    mutationFn: async (statBoosts: { strength: number; agility: number; intelligence: number; endurance: number }) => {
      const response = await apiRequest("POST", "/api/character/apply-level-up", { statBoosts });
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

  // Handle level up modal
  const handleLevelUpClose = (statBoosts?: { strength: number; agility: number; intelligence: number; endurance: number }) => {
    if (statBoosts) {
      applyLevelUpMutation.mutate(statBoosts);
    } else {
      setShowLevelUp(false);
      setLevelUpData(null);
    }
  };

  // Простая проверка загрузки
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
          <p>Ошибка аутентификации</p>
        </div>
      </div>
    );
  }

  if (userLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
          <p className="text-red-400">Ошибка загрузки: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!gameState?.character) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Cats War - Война Котов</h1>
          <p>У вас нет персонажа. Создайте его!</p>
          <button 
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={() => window.location.href = '/create-character'}
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

  // Простая версия интерфейса
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Cats War - Война Котов</h1>
        
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h2 className="text-xl font-bold mb-2">Персонаж: {character.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>Уровень: {character.level}</p>
              <p>Опыт: {character.experience}</p>
              <p>Здоровье: {character.currentHp}/{character.maxHp}</p>
            </div>
            <div>
              <p>Сила: {character.strength}</p>
              <p>Ловкость: {character.agility}</p>
              <p>Интеллект: {character.intelligence}</p>
              <p>Выносливость: {character.endurance}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h3 className="text-lg font-bold mb-2">Локация: {location?.name}</h3>
          <p>Игроков в локации: {playersInLocation.length}</p>
          <p>NPC в локации: {npcsInLocation.length}</p>
        </div>

        <div className="space-y-2">
          <button 
            className="w-full bg-green-600 hover:bg-green-700 p-3 rounded text-white font-medium"
            onClick={() => {
              // Дать опыт для тестирования повышения уровня
              fetch('/api/admin/characters/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experience: character.experience + 50 })
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
              });
            }}
          >
            Получить опыт (+50)
          </button>
          
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded text-white font-medium"
            onClick={() => {
              // Восстановить здоровье
              fetch('/api/admin/characters/1', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentHp: character.maxHp })
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
              });
            }}
          >
            Восстановить здоровье
          </button>
        </div>

        {/* Level Up Modal */}
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
    </div>
  );
}
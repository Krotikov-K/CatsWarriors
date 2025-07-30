import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Sword, Shield } from 'lucide-react';

interface TerritoryBattle {
  id: number;
  locationId: number;
  attackingClan: string;
  defendingClan: string | null;
  status: string;
  winner: string | null;
  participants: number[] | string;
  battleStartTime: string;
  locationName?: string;
  declaredByName?: string;
}

interface Character {
  id: number;
  name: string;
  clan: string;
  level: number;
  hp: number;
  maxHp: number;
  gender: string;
}

interface TerritoryBattleModalProps {
  battle: TerritoryBattle | null;
  isOpen: boolean;
  onClose: () => void;
  currentCharacter: Character;
}

const TerritoryBattleModal: React.FC<TerritoryBattleModalProps> = ({
  battle,
  isOpen,
  onClose,
  currentCharacter,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Get battle participants
  const { data: battleParticipants } = useQuery({
    queryKey: ['/api/territory/battle-participants', battle?.id],
    queryFn: () => fetch(`/api/territory/battle-participants/${battle?.id}`).then(res => res.json()),
    enabled: !!battle && isOpen,
    refetchInterval: 2000,
  });

  // Get territory combat data
  const { data: territoryCombat } = useQuery({
    queryKey: ['/api/territory/combat', battle?.id],
    queryFn: async () => {
      if (!battle?.id) return null;
      try {
        const response = await fetch(`/api/territory/combat/${battle.id}`);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: !!battle?.id && isOpen,
    refetchInterval: 1000,
  });

  // Timer for preparation phase
  useEffect(() => {
    if (!battle || battle.status !== 'preparing') return;

    const updateTimer = () => {
      const battleTime = new Date(battle.battleStartTime).getTime();
      const now = Date.now();
      const diff = battleTime - now;

      if (diff <= 0) {
        setTimeRemaining('Битва началась!');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [battle]);

  if (!battle) return null;

  const getClanName = (clan: string) => clan === 'thunder' ? 'Грозовое племя ⚡' : 'Речное племя 🌊';
  
  // Parse participants if it's a string
  const participantIds = typeof battle.participants === 'string' 
    ? JSON.parse(battle.participants) 
    : battle.participants;
  
  const isParticipating = participantIds.includes(currentCharacter.id);

  // Show active combat interface
  if (battle.status === 'active' || territoryCombat) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              ⚔️ Территориальная битва: {battle.locationName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 animate-pulse mb-2">
                🔥 БИТВА В РАЗГАРЕ! 🔥
              </h2>
              <p className="text-lg text-muted-foreground">
                Массовое сражение за контроль территории
              </p>
            </div>

            <div className="bg-gradient-to-r from-red-500/10 to-blue-500/10 p-6 rounded-lg border border-red-500/20">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Sword className="w-6 h-6 text-red-500 mr-2" />
                    <span className="text-xl font-bold text-red-600">Атака</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {getClanName(battle.attackingClan)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Участников: {battleParticipants?.attacking?.length || 0}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-4xl animate-bounce">⚔️</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {territoryCombat ? 'Пошаговый бой' : 'Подготовка...'}
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Shield className="w-6 h-6 text-blue-500 mr-2" />
                    <span className="text-xl font-bold text-blue-600">Оборона</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {getClanName(battle.defendingClan)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Участников: {battleParticipants?.defending?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {territoryCombat && (
              <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                <div className="text-center text-lg font-semibold mb-2 text-orange-600">
                  🎯 Автоматический комбат активен
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Ход {territoryCombat.currentTurn + 1} • Комбат ID: {territoryCombat.id}
                </div>
                <div className="text-xs text-center text-orange-400 mt-2">
                  Битва завершится автоматически через несколько секунд
                </div>
              </div>
            )}

            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              <div className="text-sm text-center text-green-600 font-medium">
                ✨ Все участники получат 200 опыта по завершении битвы
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show preparation interface
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            🕒 Подготовка к битве: {battle.locationName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <div className="text-2xl">⏰</div>
                <div className="text-lg font-semibold">
                  Битва начнется через:
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-500/20 text-lg">
                  {timeRemaining}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">Атакующие</div>
              <div className="text-sm">{getClanName(battle.attackingClan)}</div>
              <div className="text-lg font-bold">{battleParticipants?.attacking?.length || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">Защищающиеся</div>
              <div className="text-sm">{getClanName(battle.defendingClan)}</div>
              <div className="text-lg font-bold">{battleParticipants?.defending?.length || 0}</div>
            </div>
          </div>

          {isParticipating && (
            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
              <div className="text-sm text-center text-green-600 font-medium">
                ✅ Вы участвуете в этой битве
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TerritoryBattleModal;
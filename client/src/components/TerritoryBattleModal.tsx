import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

interface TerritoryBattle {
  id: number;
  locationId: number;
  attackingClan: string;
  defendingClan: string | null;
  status: string;
  winner: string | null;
  participants: number[];
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

  const { data: battleParticipants } = useQuery({
    queryKey: ['/api/territory/battle-participants', battle?.id],
    enabled: !!battle && isOpen,
  });

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

  const getClanDisplayName = (clan: string) => {
    return clan === 'thunder' ? 'Грозовое племя' : 'Речное племя';
  };

  const getClanEmoji = (clan: string) => {
    return clan === 'thunder' ? '⚡' : '🌊';
  };

  const getStatusIcon = () => {
    switch (battle.status) {
      case 'preparing': return '🕒';
      case 'active': return '⚔️';
      case 'completed': return '🏆';
      default: return '❓';
    }
  };

  const getStatusText = () => {
    switch (battle.status) {
      case 'preparing': return 'Подготовка к битве';
      case 'active': return 'Битва идёт!';
      case 'completed': return 'Битва завершена';
      default: return 'Неизвестно';
    }
  };

  const isParticipating = battle.participants.includes(currentCharacter.id);
  const attackingCount = battleParticipants?.attacking?.length || 0;
  const defendingCount = battleParticipants?.defending?.length || 0;
  const totalParticipants = battle.participants.length;

  const getProgressPercentage = () => {
    if (battle.status === 'completed') return 100;
    if (battle.status === 'active') return 75;
    if (battle.status === 'preparing') {
      const battleTime = new Date(battle.battleStartTime).getTime();
      const now = Date.now();
      const total = 5 * 60 * 1000; // 5 minutes
      const elapsed = total - (battleTime - now);
      return Math.max(0, Math.min(100, (elapsed / total) * 100));
    }
    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {getStatusIcon()} Битва за {battle.locationName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Battle Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{getStatusText()}</span>
                {battle.status === 'preparing' && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/20">
                    {timeRemaining}
                  </Badge>
                )}
                {battle.status === 'active' && (
                  <Badge variant="destructive">В процессе</Badge>
                )}
                {battle.status === 'completed' && battle.winner && (
                  <Badge className={battle.winner === 'thunder' ? 'bg-yellow-500' : 'bg-blue-500'}>
                    Победил {getClanEmoji(battle.winner)}
                  </Badge>
                )}
              </div>
              
              <Progress value={getProgressPercentage()} className="h-2" />
            </CardContent>
          </Card>

          {/* Opposing Forces */}
          <div className="grid grid-cols-1 gap-3">
            {/* Attacking Clan */}
            <Card className={`border-2 ${battle.attackingClan === 'thunder' ? 'border-yellow-500/30' : 'border-blue-500/30'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getClanEmoji(battle.attackingClan)}</span>
                    <div>
                      <p className="font-medium">{getClanDisplayName(battle.attackingClan)}</p>
                      <p className="text-xs text-muted-foreground">Атакующие</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {attackingCount} воинов
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* VS Divider */}
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                ⚔️ VS ⚔️
              </Badge>
            </div>

            {/* Defending Clan */}
            {battle.defendingClan ? (
              <Card className={`border-2 ${battle.defendingClan === 'thunder' ? 'border-yellow-500/30' : 'border-blue-500/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getClanEmoji(battle.defendingClan)}</span>
                      <div>
                        <p className="font-medium">{getClanDisplayName(battle.defendingClan)}</p>
                        <p className="text-xs text-muted-foreground">Защитники</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {defendingCount} воинов
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-gray-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏞️</span>
                      <div>
                        <p className="font-medium">Нейтральная территория</p>
                        <p className="text-xs text-muted-foreground">Без защитников</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      Захват
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Battle Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Всего участников:</p>
                  <p className="font-bold text-lg">{totalParticipants} воинов</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Объявил битву:</p>
                  <p className="font-medium">{battle.declaredByName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participation Status */}
          {isParticipating ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 text-center">
                <p className="text-green-400 font-medium">✓ Вы участвуете в битве!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Получите опыт независимо от исхода битвы
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground">Вы не участвуете в битве</p>
              </CardContent>
            </Card>
          )}

          {/* Battle Results */}
          {battle.status === 'completed' && battle.winner && (
            <Card className={`border-2 ${battle.winner === 'thunder' ? 'border-yellow-500' : 'border-blue-500'} bg-gradient-to-r ${battle.winner === 'thunder' ? 'from-yellow-500/10 to-yellow-600/5' : 'from-blue-500/10 to-blue-600/5'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold mb-2">
                  🏆 Победил {getClanEmoji(battle.winner)} {getClanDisplayName(battle.winner)}!
                </p>
                <p className="text-sm text-muted-foreground">
                  Территория теперь принадлежит победившему племени
                </p>
                {isParticipating && (
                  <p className="text-sm text-green-400 mt-2">
                    +200 опыта за участие в битве!
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <Button onClick={onClose} className="w-full">
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TerritoryBattleModal;
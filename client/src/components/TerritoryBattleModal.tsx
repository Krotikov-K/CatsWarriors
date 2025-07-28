import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import CombatInterface from './CombatInterface';
import { Eye } from 'lucide-react';

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
  const [showCombat, setShowCombat] = useState<boolean>(false);
  const [combatMessages, setCombatMessages] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<{thunder: number, river: number}>({thunder: 0, river: 0});

  const { data: battleParticipants } = useQuery({
    queryKey: ['/api/territory/battle-participants', battle?.id],
    queryFn: () => fetch(`/api/territory/battle-participants/${battle?.id}`).then(res => res.json()),
    enabled: !!battle && isOpen,
  });

  // Check if there's an active territory combat
  const { data: territoryCombat } = useQuery({
    queryKey: ['/api/territory/combat', battle?.id],
    queryFn: () => fetch(`/api/territory/combat/${battle?.id}`).then(res => res.json()),
    enabled: !!battle && isOpen,
    refetchInterval: 3000,
  });

  // Automatically show combat when there's an active territory combat
  useEffect(() => {
    if (territoryCombat && territoryCombat.status === 'active' && !showCombat) {
      setShowCombat(true);
    }
  }, [territoryCombat, showCombat]);

  // WebSocket listener for combat messages
  useEffect(() => {
    if (!battle || !isOpen) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'territory_battle_combat' && data.battleId === battle.id) {
        setCombatMessages(prev => [...prev, ...data.messages]);
        setTeamCounts({
          thunder: data.thunderCount,
          river: data.riverCount
        });
        setShowCombat(true);
      }
      
      if (data.type === 'territory_battle_ended' && data.battleId === battle.id) {
        setShowCombat(false);
        onClose(); // Close modal when battle ends
      }
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      socket.removeEventListener('message', handleWebSocketMessage);
      socket.close();
    };
  }, [battle, isOpen, onClose]);

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

  // Show combat interface if combat is active and user wants to watch
  if (showCombat && territoryCombat) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Территориальная битва: {battle.locationName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="bg-red-100 text-red-700">
                Активная битва
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCombat(false)}
              >
                Скрыть бой
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center text-lg font-bold text-red-600 animate-pulse">
                ⚔️ МАССОВАЯ БИТВА В РАЗГАРЕ! ⚔️
              </div>
              
              {/* Live Battle Animation */}
              <div className="bg-gradient-to-r from-red-500/10 to-blue-500/10 p-4 rounded-lg border border-red-500/20">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">
                      {getClanEmoji(battle.attackingClan)} {getClanDisplayName(battle.attackingClan)}
                    </div>
                    <div className="text-sm text-muted-foreground">Атакующие</div>
                    <div className="text-2xl font-bold text-red-400">{attackingCount}</div>
                  </div>
                  
                  <div className="text-4xl animate-bounce">⚔️</div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {battle.defendingClan ? getClanEmoji(battle.defendingClan) : '🏞️'} 
                      {battle.defendingClan ? getClanDisplayName(battle.defendingClan) : 'Нейтральная территория'}
                    </div>
                    <div className="text-sm text-muted-foreground">Защитники</div>
                    <div className="text-2xl font-bold text-blue-400">{defendingCount}</div>
                  </div>
                </div>
                
                {/* Battle Progress Animation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">Сила атакующих</span>
                    <span className="text-blue-400">Сила защитников</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-2000 animate-pulse"
                      style={{ width: `${attackingCount > 0 ? Math.min(100, (attackingCount / Math.max(attackingCount + defendingCount, 1)) * 100) : 0}%` }}
                    />
                    <div 
                      className="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-500 to-blue-600 rounded-full transition-all duration-2000 animate-pulse"
                      style={{ width: `${defendingCount > 0 ? Math.min(100, (defendingCount / Math.max(attackingCount + defendingCount, 1)) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Live Battle Messages */}
                <div className="mt-4 space-y-1">
                  <div className="text-xs text-center text-yellow-400 animate-pulse">
                    💥 Воины сражаются за контроль над территорией!
                  </div>
                  <div className="text-xs text-center text-orange-400">
                    🔥 Исход решается на основе силы, уровня и здоровья участников
                  </div>
                  <div className="text-xs text-center text-green-400">
                    ✨ Все участники получат 200 опыта после битвы
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-center border border-yellow-500/20 bg-yellow-500/5 p-2 rounded">
                <div className="font-medium text-yellow-400">Территориальная битва</div>
                <div className="text-muted-foreground">
                  Бой ID: {territoryCombat.id} | Участников: {totalParticipants}
                </div>
                <div className="text-orange-400 mt-1">
                  ⏱️ Битва завершится автоматически через несколько секунд
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

  // Parse participants from string if needed
  const participantIds = typeof battle.participants === 'string' 
    ? JSON.parse(battle.participants) 
    : battle.participants;
  
  const isParticipating = participantIds.includes(currentCharacter.id);
  const attackingCount = battleParticipants?.attacking?.length || 0;
  const defendingCount = battleParticipants?.defending?.length || 0;
  const totalParticipants = participantIds.length;

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
                  <div className="flex gap-2">
                    <Badge variant="destructive">В процессе</Badge>
                    {territoryCombat && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCombat(true)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Наблюдать
                      </Button>
                    )}
                  </div>
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

          {/* Active Battle Power Display */}
          {battle.status === 'active' && battleParticipants && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 text-center flex items-center justify-center gap-2">
                  ⚔️ Битва идёт! ⚔️
                  <Badge variant="destructive" className="animate-pulse text-xs">
                    LIVE
                  </Badge>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>{getClanEmoji(battle.attackingClan)}</span>
                      <span className="text-sm font-medium">Атакующие</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-400">{attackingCount}</span>
                      <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (attackingCount / Math.max(attackingCount + defendingCount, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>{battle.defendingClan ? getClanEmoji(battle.defendingClan) : '🏞️'}</span>
                      <span className="text-sm font-medium">Защитники</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-400">{defendingCount}</span>
                      <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (defendingCount / Math.max(attackingCount + defendingCount, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                    💡 Исход решается автоматически на основе силы участников!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                    ✓ Участвую в битве
                  </Badge>
                  {battle.status === 'active' && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      +200 опыта
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {battle.status === 'preparing' && 'Получите опыт после завершения битвы'}
                  {battle.status === 'active' && 'Битва идёт! Опыт будет начислен по окончании'}
                  {battle.status === 'completed' && 'Опыт уже начислен за участие'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground">Вы не участвуете в битве</p>
                {battle.status === 'preparing' && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Только участники от вражеских кланов могут присоединиться
                  </p>
                )}
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
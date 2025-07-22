import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TerritoryBattle {
  id: number;
  locationId: number;
  locationName: string;
  attackingClan: string;
  defendingClan: string | null;
  declaredBy: number;
  declaredByName: string;
  battleStartTime: string;
  status: string;
  participants: number[];
}

interface ClanInfluence {
  id: number;
  clan: string;
  influencePoints: number;
  lastPointsGained: string;
}

interface TerritoryOwnership {
  id: number;
  locationId: number;
  ownerClan: string;
  capturedAt: string;
  capturedBy: number;
}

interface TerritoryWarPanelProps {
  character: any;
  location: any;
}

const TerritoryWarPanel: React.FC<TerritoryWarPanelProps> = ({ character, location }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clan influence
  const { data: influence } = useQuery<ClanInfluence>({
    queryKey: [`/api/territory/influence/${character.clan}`],
    enabled: !!character.clan,
  });

  // Fetch active battles at current location
  const { data: battlesData } = useQuery<{ battles: TerritoryBattle[] }>({
    queryKey: [`/api/territory/battles`, { locationId: location.id }],
    enabled: !!location.id,
  });

  // Fetch territory ownership
  const { data: ownershipData } = useQuery<{ territories: TerritoryOwnership[] }>({
    queryKey: ['/api/territory/ownership'],
  });

  const declareBattleMutation = useMutation({
    mutationFn: (data: { locationId: number; declaredBy: number }) =>
      apiRequest(`/api/territory/declare-battle`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      if (data.type === 'auto_capture') {
        toast({
          title: 'Территория захвачена!',
          description: `Нейтральная территория ${location.name} теперь принадлежит вашему племени.`,
        });
      } else {
        toast({
          title: 'Битва объявлена!',
          description: `Битва за ${location.name} начнется через час.`,
        });
      }
      // Force immediate and comprehensive refresh
      queryClient.invalidateQueries({ queryKey: [`/api/territory/influence/${character.clan}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/territory/battles`] });
      queryClient.invalidateQueries({ queryKey: ['/api/territory/ownership'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      
      // Force immediate refetch with multiple attempts
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/territory/ownership'] });
        queryClient.refetchQueries({ queryKey: [`/api/territory/influence/${character.clan}`] });
      }, 100);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/territory/ownership'] });
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось объявить битву',
        variant: 'destructive',
      });
    },
  });

  const joinBattleMutation = useMutation({
    mutationFn: (data: { battleId: number; characterId: number }) =>
      apiRequest(`/api/territory/join-battle`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: 'Присоединились к битве!',
        description: 'Вы будете участвовать в территориальной битве.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/territory/battles`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось присоединиться к битве',
        variant: 'destructive',
      });
    },
  });

  const canDeclare = character.rank === 'leader' || character.rank === 'deputy';
  const hasInfluence = influence && influence.influencePoints > 0;
  const battles = battlesData?.battles || [];
  const territories = ownershipData?.territories || [];
  
  // Find current location ownership
  const locationOwnership = territories.find(t => t.locationId === location.id);
  const isOwnedByClan = locationOwnership?.ownerClan === character.clan;
  const isNeutral = !locationOwnership;
  const isCamp = location.type === 'camp';

  // Check if there's an active battle at this location
  const activeBattle = battles.find(b => b.locationId === location.id);
  const isInvolvedInBattle = activeBattle && (
    activeBattle.attackingClan === character.clan || 
    activeBattle.defendingClan === character.clan
  );

  const handleDeclareBattle = () => {
    declareBattleMutation.mutate({
      locationId: location.id,
      declaredBy: character.id,
    });
  };

  const handleJoinBattle = (battleId: number) => {
    joinBattleMutation.mutate({
      battleId,
      characterId: character.id,
    });
  };

  const getTimeUntilBattle = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return 'Битва идет!';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}ч ${remainingMinutes}м`;
    }
    return `${minutes}м`;
  };

  const getClanDisplayName = (clan: string) => {
    return clan === 'thunder' ? 'Грозовое племя' : 'Речное племя';
  };

  const getClanEmoji = (clan: string) => {
    return clan === 'thunder' ? '⚡' : '🌊';
  };

  if (isCamp) {
    return null; // Don't show territory war panel in camps
  }

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          ⚔️ Война за территории
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clan Influence */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Очки влияния:</span>
          <Badge variant="outline">
            {influence?.influencePoints || 0} очков
          </Badge>
        </div>

        {/* Territory Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Владелец:</span>
            {isNeutral ? (
              <Badge variant="secondary">Нейтральная</Badge>
            ) : (
              <Badge className={locationOwnership?.ownerClan === 'thunder' ? 'bg-yellow-500' : 'bg-blue-500'}>
                {getClanEmoji(locationOwnership?.ownerClan || '')} {getClanDisplayName(locationOwnership?.ownerClan || '')}
              </Badge>
            )}
          </div>
        </div>

        {/* Active Battle */}
        {activeBattle && (
          <div className="space-y-2 p-3 bg-destructive/10 border border-destructive/20 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-destructive">⚡ Активная битва</span>
              <Badge variant="destructive" className="text-xs">
                {getTimeUntilBattle(activeBattle.battleStartTime)}
              </Badge>
            </div>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Атакующие: {getClanEmoji(activeBattle.attackingClan)} {getClanDisplayName(activeBattle.attackingClan)}</div>
              {activeBattle.defendingClan && (
                <div>Защитники: {getClanEmoji(activeBattle.defendingClan)} {getClanDisplayName(activeBattle.defendingClan)}</div>
              )}
              <div>Участники: {activeBattle.participants.length}</div>
            </div>

            {isInvolvedInBattle && !activeBattle.participants.includes(character.id) && (
              <Button
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => handleJoinBattle(activeBattle.id)}
                disabled={joinBattleMutation.isPending}
              >
                Присоединиться к битве
              </Button>
            )}

            {activeBattle.participants.includes(character.id) && (
              <Badge variant="outline" className="w-full justify-center bg-green-500/10 text-green-400 border-green-500/20">
                ✓ Вы участвуете в битве
              </Badge>
            )}
          </div>
        )}

        {/* Declare Battle Button */}
        {!activeBattle && canDeclare && !isOwnedByClan && (
          <div className="space-y-2">
            {!hasInfluence && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded">
                Нужно 1 очко влияния для объявления битвы. Племена получают 1 очко каждые 24 часа.
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleDeclareBattle}
              disabled={!hasInfluence || declareBattleMutation.isPending}
            >
              {isNeutral ? 'Захватить территорию' : 'Объявить битву'} 
              {!isNeutral && ' (1 очко влияния)'}
            </Button>
          </div>
        )}

        {!canDeclare && !activeBattle && (
          <p className="text-xs text-muted-foreground text-center">
            Только предводители и глашатаи могут объявлять битвы за территории
          </p>
        )}

        {isOwnedByClan && (
          <Badge variant="outline" className="w-full justify-center bg-green-500/10 text-green-400 border-green-500/20">
            ✓ Территория принадлежит вашему племени
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default TerritoryWarPanel;
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface BattleResultsModalProps {
  battle: TerritoryBattle | null;
  isOpen: boolean;
  onClose: () => void;
}

const BattleResultsModal: React.FC<BattleResultsModalProps> = ({
  battle,
  isOpen,
  onClose,
}) => {
  if (!battle) return null;

  const getClanDisplayName = (clan: string) => {
    return clan === 'thunder' ? 'Грозовое племя' : 'Речное племя';
  };

  const getClanEmoji = (clan: string) => {
    return clan === 'thunder' ? '⚡' : '🌊';
  };

  const getWinnerDisplay = () => {
    if (!battle.winner) return 'Неизвестно';
    return `${getClanEmoji(battle.winner)} ${getClanDisplayName(battle.winner)}`;
  };

  const isVictory = (characterClan: string) => {
    return battle.winner === characterClan;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {battle.winner ? '🏆 Битва завершена!' : '⚔️ Результаты битвы'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <h3 className="font-bold text-lg mb-2">{battle.locationName}</h3>
            <p className="text-muted-foreground">Территориальная битва</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Атакующие</p>
              <Badge className={battle.attackingClan === 'thunder' ? 'bg-yellow-500' : 'bg-blue-500'}>
                {getClanEmoji(battle.attackingClan)} {getClanDisplayName(battle.attackingClan)}
              </Badge>
            </div>

            <div className="text-center p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Защитники</p>
              {battle.defendingClan ? (
                <Badge className={battle.defendingClan === 'thunder' ? 'bg-yellow-500' : 'bg-blue-500'}>
                  {getClanEmoji(battle.defendingClan)} {getClanDisplayName(battle.defendingClan)}
                </Badge>
              ) : (
                <Badge variant="secondary">Нейтральная территория</Badge>
              )}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Участников в битве:</p>
            <p className="text-2xl font-bold">{battle.participants.length} воинов</p>
          </div>

          {battle.winner && (
            <div className={`text-center p-4 rounded-lg ${battle.winner === 'thunder' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
              <p className="text-sm mb-2">🏆 Победитель</p>
              <p className="text-xl font-bold">{getWinnerDisplay()}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Территория теперь принадлежит победившему племени
              </p>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Все участники получили опыт за участие в битве!
            </p>
            <Button onClick={onClose} className="w-full">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BattleResultsModal;
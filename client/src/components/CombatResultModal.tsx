import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Skull, Star, Coins } from "lucide-react";

interface CombatResult {
  victory: boolean;
  experienceGained: number;
  damageDealt: number;
  damageTaken: number;
  enemyName: string;
  survivedTurns: number;
}

interface CombatResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CombatResult | null;
}

export default function CombatResultModal({ isOpen, onClose, result }: CombatResultModalProps) {
  if (!result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.victory ? (
              <>
                <Trophy className="h-6 w-6 text-yellow-500" />
                Победа!
              </>
            ) : (
              <>
                <Skull className="h-6 w-6 text-red-500" />
                Поражение
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Результаты боя с {result.enemyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Основной результат */}
          <div className="text-center p-4 rounded-lg bg-muted">
            {result.victory ? (
              <div className="text-green-600 font-semibold">
                Вы одержали победу над противником!
              </div>
            ) : (
              <div className="text-red-600 font-semibold">
                Вы потерпели поражение в бою.
              </div>
            )}
          </div>

          <Separator />

          {/* Статистика боя */}
          <div className="space-y-3">
            <h4 className="font-medium">Статистика боя:</h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-blue-500" />
                <span>Опыт: +{result.experienceGained}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {result.survivedTurns} ходов
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-green-600">⚔️ Урон: {result.damageDealt}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-red-600">💔 Получено: {result.damageTaken}</span>
              </div>
            </div>
          </div>

          {result.victory && (
            <>
              <Separator />
              <div className="text-center text-sm text-muted-foreground">
                Победа дает дополнительный опыт для развития персонажа!
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Продолжить игру
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
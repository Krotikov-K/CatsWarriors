import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Crown, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { type Character, type Location, RANKS } from "@shared/schema";
import ElderPromotionDialog from "./ElderPromotionDialog";
import RankManagement from "./RankManagement";

interface CampActionsProps {
  character: Character;
  location: Location;
  playersInLocation: Character[];
}

export default function CampActions({ character, location, playersInLocation }: CampActionsProps) {
  const { toast } = useToast();
  const [showElderDialog, setShowElderDialog] = useState(false);

  const usePoultice = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/health/use-poultice", {
        characterId: character.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Лечебная припарка использована",
        description: `Восстановлено здоровье! Текущее HP: ${data.character.currentHp}/${data.character.maxHp}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось использовать лечебную припарку",
        variant: "destructive",
      });
    },
  });

  // Check if character is in any camp (for testing, show in all camps)
  const isInCamp = location.type === "camp";
  const canUsePoultice = isInCamp && character.currentHp < character.maxHp;
  const isKitten = character.rank === "kitten";
  const isInOwnCamp = isInCamp && location.clan === character.clan;
  const currentRank = RANKS[character.rank as keyof typeof RANKS];
  const canManageRanks = currentRank?.canPromote?.length > 0;

  // Show camp actions in any camp for now
  if (!isInCamp) {
    return null;
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        {/* Elder promotion section for kittens */}
        {isKitten && isInOwnCamp && (
          <div className="border-b border-border pb-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">Обряд посвящения</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Старейшина племени готов провести обряд посвящения. 
              Пришло время выбрать свой путь!
            </div>
            <Button
              onClick={() => setShowElderDialog(true)}
              className="w-full"
              variant="default"
            >
              👴 Подойти к старейшине
            </Button>
          </div>
        )}

        {/* Rank Management section for leaders/deputies */}
        {canManageRanks && isInOwnCamp && (
          <div className="border-b border-border pb-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">Управление племенем</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Назначайте соплеменников на должности в племени
            </div>
            <RankManagement 
              character={character} 
              playersInLocation={playersInLocation}
            />
          </div>
        )}

        {/* Healing section */}
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold">Лечение в лагере</h3>
        </div>
      
      <div className="space-y-3">
        <div className="text-sm">
          <div className="flex justify-between items-center mb-2">
            <span>Здоровье:</span>
            <span className="font-medium text-foreground">{character.currentHp}/{character.maxHp} HP</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div 
              className="bg-red-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, (character.currentHp / character.maxHp) * 100)}%` }}
            />
          </div>
        </div>



        <Button
          onClick={() => usePoultice.mutate()}
          disabled={!canUsePoultice || usePoultice.isPending}
          className="w-full"
          variant={canUsePoultice ? "default" : "outline"}
        >
          <Zap className="h-4 w-4 mr-2" />
          {usePoultice.isPending 
            ? "Применяется..." 
            : canUsePoultice 
              ? "Использовать лечебную припарку (+100 HP)" 
              : "Здоровье уже полное"
          }
        </Button>
      </div>
      </div>

      <ElderPromotionDialog
        isOpen={showElderDialog}
        onClose={() => setShowElderDialog(false)}
        character={character}
      />
    </>
  );
}
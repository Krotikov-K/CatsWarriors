import { Button } from "@/components/ui/button";
import { Heart, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { type Character, type Location } from "@shared/schema";

interface CampActionsProps {
  character: Character;
  location: Location;
}

export default function CampActions({ character, location }: CampActionsProps) {
  const { toast } = useToast();

  const usePoultice = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/health/use-poultice", {});
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

  // Check if character is in their clan's camp
  const isInRightCamp = 
    (character.clan === "Thunderclan" && location.name === "Лагерь Грозового племени") ||
    (character.clan === "Riverclan" && location.name === "Лагерь Речного племени");

  const canUsePoultice = isInRightCamp && location.type === "camp" && character.currentHp < character.maxHp;

  if (!isInRightCamp || location.type !== "camp") {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-5 w-5 text-red-500" />
        <h3 className="font-semibold">Лечение в лагере</h3>
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Здоровье:</span>
            <span className="font-medium">{character.currentHp}/{character.maxHp} HP</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(character.currentHp / character.maxHp) * 100}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground p-2 bg-accent rounded">
          💡 Здоровье восстанавливается автоматически по 1 HP в минуту
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
  );
}
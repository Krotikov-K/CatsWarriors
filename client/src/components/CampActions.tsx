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

  // Show camp actions in any camp for now
  if (!isInCamp) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
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
  );
}
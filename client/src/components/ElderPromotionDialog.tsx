import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Character, RANKS } from "@shared/schema";

interface ElderPromotionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
}

export default function ElderPromotionDialog({ isOpen, onClose, character }: ElderPromotionDialogProps) {
  const { toast } = useToast();
  const [selectedRank, setSelectedRank] = useState<string>("");

  const promoteMutation = useMutation({
    mutationFn: async (newRank: string) => {
      const response = await apiRequest("POST", "/api/character/promote-kitten", {
        characterId: character.id,
        newRank: newRank
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Обряд посвящения завершён!",
        description: `${character.name} получил новый ранг: ${RANKS[selectedRank as keyof typeof RANKS]?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game-state"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка обряда",
        description: error.message || "Не удалось провести обряд посвящения",
        variant: "destructive",
      });
    },
  });

  const handlePromotion = (newRank: string) => {
    setSelectedRank(newRank);
    promoteMutation.mutate(newRank);
  };

  if (character.rank !== "kitten") {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            👴 Старейшина племени
          </DialogTitle>
          <DialogDescription>
            Пришло время для {character.name} выбрать свой путь в племени. 
            Что ты хочешь изучать, молодой котёнок?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => handlePromotion("apprentice")}
              disabled={promoteMutation.isPending}
              variant="outline"
              className="h-auto p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔰</span>
                <div>
                  <div className="font-semibold">Стать оруженосцем</div>
                  <div className="text-sm text-muted-foreground">
                    Изучать боевые искусства и охоту
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handlePromotion("healer_apprentice")}
              disabled={promoteMutation.isPending}
              variant="outline" 
              className="h-auto p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌱</span>
                <div>
                  <div className="font-semibold">Стать учеником целителя</div>
                  <div className="text-sm text-muted-foreground">
                    Изучать травы и исцеление
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Я ещё не готов
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
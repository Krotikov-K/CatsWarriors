import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Character, RANKS, CLANS } from "@shared/schema";

interface RankManagementProps {
  character: Character;
  playersInLocation: Character[];
}

export default function RankManagement({ character, playersInLocation }: RankManagementProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [selectedRank, setSelectedRank] = useState<string>("");

  const changeRankMutation = useMutation({
    mutationFn: async ({ characterId, newRank }: { characterId: number; newRank: string }) => {
      const response = await apiRequest("POST", "/api/character/change-rank", {
        characterId,
        newRank,
        requesterId: character.userId
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ранг изменён!",
        description: `Персонаж получил новую должность: ${RANKS[selectedRank as keyof typeof RANKS]?.name}`,
      });
      // Invalidate both game state and tribe members queries
      queryClient.invalidateQueries({ queryKey: ["/api/game-state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tribe-members"] });
      
      // Force refresh after a short delay to ensure UI updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/game-state"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tribe-members"] });
      }, 500);
      
      setIsOpen(false);
      setSelectedCharacter(null);
      setSelectedRank("");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка назначения",
        description: error.message || "Не удалось изменить ранг персонажа",
        variant: "destructive",
      });
    },
  });

  const handleRankChange = () => {
    if (selectedCharacter && selectedRank) {
      changeRankMutation.mutate({ characterId: selectedCharacter, newRank: selectedRank });
    }
  };

  // Get characters from same clan
  const clanMembers = playersInLocation.filter(p => 
    p.clan === character.clan && p.id !== character.id
  );

  // Get available ranks that this character can assign
  const currentRank = RANKS[character.rank as keyof typeof RANKS];
  const availableRanks = currentRank?.canPromote || [];

  if (!currentRank?.canPromote?.length) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Crown className="h-4 w-4 mr-2" />
          Управление рангами
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Назначение на должности
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {clanMembers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Нет сокланников в этой локации</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Выберите персонажа:</label>
                <Select value={selectedCharacter?.toString() || ""} onValueChange={(value) => setSelectedCharacter(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите кота для назначения" />
                  </SelectTrigger>
                  <SelectContent>
                    {clanMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{RANKS[member.rank as keyof typeof RANKS]?.emoji}</span>
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({RANKS[member.rank as keyof typeof RANKS]?.name})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Новая должность:</label>
                <Select value={selectedRank} onValueChange={setSelectedRank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите новый ранг" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRanks.map((rankKey) => {
                      const rank = RANKS[rankKey as keyof typeof RANKS];
                      return (
                        <SelectItem key={rankKey} value={rankKey}>
                          <div className="flex items-center gap-2">
                            <span>{rank.emoji}</span>
                            <span>{rank.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleRankChange}
                  disabled={!selectedCharacter || !selectedRank || changeRankMutation.isPending}
                  className="flex-1"
                >
                  {changeRankMutation.isPending ? "Назначаю..." : "Назначить"}
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Отмена
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
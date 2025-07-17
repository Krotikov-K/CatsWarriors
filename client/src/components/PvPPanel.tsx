import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Character, CLANS, RANKS } from "@shared/schema";

interface PvPPanelProps {
  character: Character;
  playersInLocation: Character[];
  locationId: number;
}

export default function PvPPanel({ character, playersInLocation, locationId }: PvPPanelProps) {
  const { toast } = useToast();
  const [isAttacking, setIsAttacking] = useState(false);

  // Get diplomacy status
  const { data: diplomacyData } = useQuery({
    queryKey: ["/api/diplomacy"],
    refetchInterval: 5000,
  });

  const attackPlayerMutation = useMutation({
    mutationFn: async (targetId: number) => {
      const response = await apiRequest("POST", "/api/combat/start", {
        characterId: character.id,
        targetId,
        locationId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "⚔️ Дуэль начата!",
        description: "Племенная война началась! Победа или смерть!",
      });
      setIsAttacking(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка дуэли",
        description: error.message || "Не удалось начать бой",
        variant: "destructive",
      });
      setIsAttacking(false);
    },
  });

  const handleAttack = (targetId: number) => {
    setIsAttacking(true);
    attackPlayerMutation.mutate(targetId);
  };

  // Get diplomacy status between clans
  const relations = diplomacyData?.relations || {};
  const toClan = character.clan === "thunder" ? "river" : "thunder";
  const diplomacyStatus = relations[character.clan]?.[toClan] || "peace";
  
  // Filter players from enemy clans only
  const enemyPlayers = playersInLocation.filter(player => 
    player.id !== character.id && 
    player.clan !== character.clan &&
    player.currentHp > 1 // Only players with more than 1 HP
  );

  const getClanColor = (clan: string) => {
    return clan === 'thunder' ? 'text-yellow-600' : 'text-blue-600';
  };

  const getClanEmoji = (clan: string) => {
    return clan === 'thunder' ? '⚡' : '🌊';
  };

  // Check if current character can attack (has more than 1 HP and tribes are at war)
  const canAttack = character.currentHp > 1 && diplomacyStatus === "war";

  if (enemyPlayers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Племенная война
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Нет врагов поблизости</p>
            <p className="text-sm">
              {character.currentHp <= 1 
                ? "Ваш персонаж слишком слаб для дуэлей (1 HP)"
                : "Найдите игроков из другого племени для дуэли"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-red-500" />
          Племенная война
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground mb-4">
          {diplomacyStatus === "war" ? (
            <span className="text-red-600">⚔️ Идет война! Вызывайте на дуэль игроков из вражеского племени</span>
          ) : (
            <span className="text-green-600">🕊️ Мирное время. Атаки на игроков другого племени запрещены</span>
          )}
        </div>
        
        {enemyPlayers.map((player) => {
          const rankInfo = RANKS[player.rank as keyof typeof RANKS];
          const clanInfo = CLANS[player.clan as keyof typeof CLANS];
          
          return (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-lg">{player.gender === 'male' ? '🐱' : '🐈'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className={getClanColor(player.clan)}>
                      {getClanEmoji(player.clan)} {clanInfo?.name}
                    </Badge>
                    <Badge variant="secondary">
                      {rankInfo?.emoji} {rankInfo?.name}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    HP: {player.currentHp}/{player.maxHp} • Уровень {player.level}
                  </div>
                </div>
              </div>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAttack(player.id)}
                disabled={isAttacking || attackPlayerMutation.isPending || !canAttack}
                className="min-w-[100px]"
              >
                {diplomacyStatus !== "war" ? (
                  "🕊️ Мир"
                ) : character.currentHp <= 1 ? (
                  "Слаб (1 HP)"
                ) : isAttacking ? (
                  "Атакую..."
                ) : (
                  <>
                    <Swords className="h-4 w-4 mr-1" />
                    Дуэль!
                  </>
                )}
              </Button>
            </div>
          );
        })}
        
        <div className="text-xs text-muted-foreground mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
          <strong>⚠️ Правила PvP:</strong><br />
          • Дуэли возможны только между разными племенами и во время войны<br />
          • Персонажи с 1 HP не могут драться (слишком слабы)<br />
          • Проигравший остается с 1 HP (честная дуэль)<br />
          • Во время мира атаки на игроков другого племени запрещены
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Shield, Leaf, Sword, BookOpen, Baby, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Character } from "@shared/schema";

interface TribeManagementProps {
  character: Character;
}

const RANKS = {
  leader: { emoji: "👑", name: "Предводитель", canPromote: ["deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"] },
  deputy: { emoji: "⚔️", name: "Глашатай", canPromote: ["senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"] },
  senior_healer: { emoji: "🌿", name: "Старший целитель", canPromote: ["healer"] },
  healer: { emoji: "🍃", name: "Целитель", canPromote: [] },
  healer_apprentice: { emoji: "🌱", name: "Ученик целителя", canPromote: [] },
  senior_warrior: { emoji: "⭐", name: "Старший воитель", canPromote: ["warrior"] },
  warrior: { emoji: "🗡️", name: "Воитель", canPromote: [] },
  apprentice: { emoji: "🔰", name: "Оруженосец", canPromote: [] },
  kitten: { emoji: "🐾", name: "Котёнок", canPromote: [] }
};

const rankOrder = ["leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"];

export default function TribeManagement({ character }: TribeManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Character | null>(null);
  const [newRank, setNewRank] = useState<string>("");

  const currentRank = RANKS[character.rank as keyof typeof RANKS];
  const canPromoteRanks = currentRank?.canPromote || [];

  // Get all tribe members (not just those in current location)
  const { data: tribeMembers = [] } = useQuery<Character[]>({
    queryKey: ['/api/tribe-members', character.clan],
    queryFn: async () => {
      const res = await fetch(`/api/tribe-members/${character.clan}`);
      if (!res.ok) throw new Error('Failed to fetch tribe members');
      const data = await res.json();
      return data.tribeMembers || [];
    },
    refetchInterval: 5000
  });

  const changeRankMutation = useMutation({
    mutationFn: async ({ targetCharacterId, newRank }: { targetCharacterId: number; newRank: string }) => {
      const response = await apiRequest("POST", "/api/character/change-rank", {
        requesterId: character.userId,
        targetCharacterId,
        newRank
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tribe-members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      
      // Add small delay for UI consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/tribe-members'] });
      }, 500);
      
      toast({
        title: "Ранг изменён",
        description: `${selectedMember?.name} получил новую должность: ${RANKS[newRank as keyof typeof RANKS]?.name}`,
      });
      setSelectedMember(null);
      setNewRank("");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка изменения ранга",
        description: error.message || "Не удалось изменить ранг",
        variant: "destructive",
      });
    },
  });

  const handleRankChange = () => {
    if (!selectedMember || !newRank) return;
    
    changeRankMutation.mutate({
      targetCharacterId: selectedMember.id,
      newRank
    });
  };

  // Group members by rank for better organization
  const membersByRank = rankOrder.reduce((acc, rank) => {
    const members = tribeMembers.filter(member => member.rank === rank);
    if (members.length > 0) {
      acc[rank] = members;
    }
    return acc;
  }, {} as Record<string, Character[]>);

  // Filter members that can be promoted by current character
  const promotableMembers = tribeMembers.filter(member => 
    member.id !== character.id && // Can't change own rank
    (character.rank === 'leader' || canPromoteRanks.includes(member.rank)) // Can promote based on permissions
  );

  if (!canPromoteRanks.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление племенем
          </CardTitle>
          <CardDescription>
            Ваша должность не позволяет управлять рангами других членов племени.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Управление рангами
          </CardTitle>
          <CardDescription>
            Как {currentRank.name}, вы можете назначать членов племени на определённые должности
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>Ваши полномочия:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              {character.rank === 'leader' && (
                <li>Может назначать на любые должности (кроме своей)</li>
              )}
              {character.rank === 'deputy' && (
                <li>Может назначать на все должности ниже Глашатая</li>
              )}
              {character.rank === 'senior_healer' && (
                <li>Может повышать Ученика целителя до Целителя</li>
              )}
              {character.rank === 'senior_warrior' && (
                <li>Может повышать Оруженосца до Воителя</li>
              )}
            </ul>
          </div>

          {promotableMembers.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Выберите члена племени:</label>
                <Select value={selectedMember?.id.toString() || ""} onValueChange={(value) => {
                  const member = tribeMembers.find(m => m.id.toString() === value);
                  setSelectedMember(member || null);
                  setNewRank("");
                }}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Выберите члена племени" />
                  </SelectTrigger>
                  <SelectContent>
                    {promotableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{RANKS[member.rank as keyof typeof RANKS]?.emoji}</span>
                          <span>{member.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {RANKS[member.rank as keyof typeof RANKS]?.name}
                          </Badge>
                          {!member.isOnline && (
                            <Badge variant="secondary" className="text-xs">
                              Офлайн
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMember && (
                <div>
                  <label className="text-sm font-medium">Новая должность:</label>
                  <Select value={newRank} onValueChange={setNewRank}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Выберите новую должность" />
                    </SelectTrigger>
                    <SelectContent>
                      {rankOrder
                        .filter(rank => {
                          if (character.rank === 'leader') {
                            return rank !== 'leader'; // Leader can assign any rank except leader
                          }
                          if (character.rank === 'deputy') {
                            return !['leader', 'deputy'].includes(rank); // Deputy can assign ranks below deputy
                          }
                          if (character.rank === 'senior_healer') {
                            return selectedMember.rank === 'healer_apprentice' && rank === 'healer';
                          }
                          if (character.rank === 'senior_warrior') {
                            return selectedMember.rank === 'apprentice' && rank === 'warrior';
                          }
                          return false;
                        })
                        .map((rank) => (
                          <SelectItem key={rank} value={rank}>
                            <div className="flex items-center gap-2">
                              <span>{RANKS[rank as keyof typeof RANKS]?.emoji}</span>
                              <span>{RANKS[rank as keyof typeof RANKS]?.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMember && newRank && (
                <Button 
                  onClick={handleRankChange}
                  disabled={changeRankMutation.isPending}
                  className="w-full"
                >
                  {changeRankMutation.isPending 
                    ? 'Изменение ранга...' 
                    : `Назначить ${selectedMember.name} на должность ${RANKS[newRank as keyof typeof RANKS]?.name}`
                  }
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Нет доступных для назначения членов племени
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current tribe structure overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Структура племени
          </CardTitle>
          <CardDescription>
            Текущая иерархия {character.clan === 'thunder' ? 'Грозового' : 'Речного'} племени
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(membersByRank).map(([rank, members]) => (
              <div key={rank} className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span>{RANKS[rank as keyof typeof RANKS]?.emoji}</span>
                  <span>{RANKS[rank as keyof typeof RANKS]?.name}</span>
                  <Badge variant="secondary">{members.length}</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2 ml-6">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm">
                      <span>{member.name}</span>
                      {member.gender === 'female' && <span>🐱</span>}
                      {member.gender === 'male' && <span>🐈</span>}
                      {!member.isOnline && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          Офлайн
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
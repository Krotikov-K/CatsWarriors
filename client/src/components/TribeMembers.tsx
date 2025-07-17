import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scroll, Users, Crown, Shield, Heart, Leaf, Sword, BookOpen, Baby } from "lucide-react";
import type { Character } from "@shared/schema";

interface TribeMembersProps {
  character: Character;
}

const rankIcons = {
  leader: "👑",
  deputy: "⚔️", 
  senior_healer: "🌿",
  healer: "🍃",
  healer_apprentice: "🌱",
  senior_warrior: "⭐",
  warrior: "🗡️",
  apprentice: "🔰",
  kitten: "🐾"
};

const rankNames = {
  leader: "Предводитель",
  deputy: "Глашатай",
  senior_healer: "Старший целитель", 
  healer: "Целитель",
  healer_apprentice: "Ученик целителя",
  senior_warrior: "Старший воитель",
  warrior: "Воитель",
  apprentice: "Оруженосец",
  kitten: "Котёнок"
};

const rankOrder = ["leader", "deputy", "senior_healer", "healer", "healer_apprentice", "senior_warrior", "warrior", "apprentice", "kitten"];

export default function TribeMembers({ character }: TribeMembersProps) {
  const { data: tribeMembers = [] } = useQuery<Character[]>({
    queryKey: ['/api/tribe-members', character.clan],
    queryFn: async () => {
      const res = await fetch(`/api/tribe-members/${character.clan}`);
      if (!res.ok) throw new Error('Failed to fetch tribe members');
      const data = await res.json();
      return data.tribeMembers || [];
    },
    refetchInterval: 5000,
  });

  const sortedMembers = tribeMembers.sort((a: Character, b: Character) => {
    const aIndex = rankOrder.indexOf(a.rank);
    const bIndex = rankOrder.indexOf(b.rank);
    return aIndex - bIndex;
  });

  const membersByRank = sortedMembers.reduce((acc: Record<string, Character[]>, member: Character) => {
    if (!acc[member.rank]) {
      acc[member.rank] = [];
    }
    acc[member.rank].push(member);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Члены {character.clan === "thunder" ? "Грозового ⚡" : "Речного 🌊"} племени
          </CardTitle>
          <CardDescription>
            Всего соплеменников: {sortedMembers.length}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Members by Rank */}
      <div className="space-y-4">
        {rankOrder.map(rank => {
          const members = membersByRank[rank] || [];
          if (members.length === 0) return null;

          return (
            <Card key={rank}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-xl">{rankIcons[rank as keyof typeof rankIcons]}</span>
                  {rankNames[rank as keyof typeof rankNames]}
                  <Badge variant="outline" className="ml-auto">
                    {members.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map((member: Character) => (
                    <div 
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-lg">
                        {member.gender === "male" ? "🐱" : "🐈"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Ур. {member.level}</span>
                          <span>❤️ {member.currentHp}/{member.maxHp}</span>
                          {!member.isOnline && (
                            <Badge variant="outline" className="text-xs">
                              Офлайн
                            </Badge>
                          )}
                        </div>
                      </div>
                      {member.id === character.id && (
                        <Badge variant="secondary" className="text-xs">
                          Вы
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scroll className="h-5 w-5" />
            Статистика племени
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {membersByRank.leader?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Предводители</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(membersByRank.warrior?.length || 0) + (membersByRank.senior_warrior?.length || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Воители</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(membersByRank.healer?.length || 0) + (membersByRank.senior_healer?.length || 0) + (membersByRank.healer_apprentice?.length || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Целители</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(membersByRank.apprentice?.length || 0) + (membersByRank.kitten?.length || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Ученики</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
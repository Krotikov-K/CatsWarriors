import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, Heart, Star } from "lucide-react";
import { type Character, RANKS } from "@shared/schema";

interface TribeMembersProps {
  clan: string;
  currentCharacter: Character;
}

export default function TribeMembers({ clan, currentCharacter }: TribeMembersProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/tribe-members", clan],
    queryFn: async () => {
      const response = await fetch(`/api/tribe-members/${clan}`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить список членов племени");
      }
      return response.json();
    },
    refetchInterval: 30000, // Update every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Члены племени
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Загрузка...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.tribeMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Члены племени
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Не удалось загрузить список членов племени
          </div>
        </CardContent>
      </Card>
    );
  }

  const tribeMembers = data.tribeMembers as Character[];
  
  // Group members by rank
  const membersByRank: Record<string, Character[]> = {};
  tribeMembers.forEach(member => {
    if (!membersByRank[member.rank]) {
      membersByRank[member.rank] = [];
    }
    membersByRank[member.rank].push(member);
  });

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case "leader":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "deputy":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "senior_healer":
      case "healer":
      case "healer_apprentice":
        return <Heart className="h-4 w-4 text-green-500" />;
      case "senior_warrior":
        return <Star className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Члены племени ({tribeMembers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(membersByRank).map(([rank, members]) => {
          const rankInfo = RANKS[rank as keyof typeof RANKS];
          if (!rankInfo) return null;

          return (
            <div key={rank} className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                {getRankIcon(rank)}
                <span>{rankInfo.emoji} {rankInfo.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {members.length}
                </Badge>
              </div>
              
              <div className="grid gap-2 ml-6">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      member.id === currentCharacter.id 
                        ? "bg-primary/10 border-primary/20" 
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {member.id === currentCharacter.id && (
                        <Badge variant="outline" className="text-xs">
                          Вы
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Ур. {member.level}</span>
                      <span>{member.gender === 'male' ? '🐱' : '🐈'}</span>
                      <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {tribeMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            В племени пока нет активных членов
          </div>
        )}
      </CardContent>
    </Card>
  );
}
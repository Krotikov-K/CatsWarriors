import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, UserPlus, LogOut, Sword } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Group, Character, GameState } from "@shared/schema";

interface GroupPanelProps {
  gameState: GameState;
}

export default function GroupPanel({ gameState }: GroupPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");

  const { data: groupMembers = [] } = useQuery<Character[]>({
    queryKey: ['/api/groups', gameState.currentGroup?.id, 'members'],
    enabled: !!gameState.currentGroup,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string }) => apiRequest('/api/groups', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      setGroupName("");
      toast({
        title: "Группа создана",
        description: "Вы успешно создали новую группу",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать группу",
        variant: "destructive",
      });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId: number) => apiRequest(`/api/groups/${groupId}/join`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Присоединение к группе",
        description: "Вы присоединились к группе",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к группе",
        variant: "destructive",
      });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => apiRequest('/api/groups/leave', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Покинули группу",
        description: "Вы покинули группу",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка", 
        description: "Не удалось покинуть группу",
        variant: "destructive",
      });
    }
  });

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroupMutation.mutate({ name: groupName.trim() });
    }
  };

  const handleJoinGroup = (groupId: number) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleLeaveGroup = () => {
    leaveGroupMutation.mutate();
  };

  if (!gameState.character) return null;

  return (
    <div className="space-y-4">
      {/* Current Group */}
      {gameState.currentGroup ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {gameState.currentGroup.name}
              {gameState.currentGroup.leaderId === gameState.character.id && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              Участников: {groupMembers.length}/{gameState.currentGroup.maxMembers}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {groupMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    {member.id === gameState.currentGroup?.leaderId && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      Ур. {member.level}
                    </Badge>
                  </div>
                  <Badge variant={member.clan === "thunder" ? "default" : "secondary"}>
                    {member.clan === "thunder" ? "⚡ Грозовое" : "🌊 Речное"}
                  </Badge>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={handleLeaveGroup}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={leaveGroupMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Покинуть группу
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Создать группу
            </CardTitle>
            <CardDescription>
              Объединитесь с другими игроками для совместных приключений
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Название группы"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={30}
              />
              <Button 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || createGroupMutation.isPending}
              >
                Создать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Groups */}
      {!gameState.currentGroup && gameState.groupsInLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Доступные группы
            </CardTitle>
            <CardDescription>
              Присоединитесь к существующим группам в этой локации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gameState.groupsInLocation.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Макс. участников: {group.maxMembers}
                  </div>
                </div>
                <Button 
                  onClick={() => handleJoinGroup(group.id)}
                  size="sm"
                  disabled={joinGroupMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Присоединиться
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
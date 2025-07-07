import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, UserPlus, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GameState } from "@shared/schema";

interface GroupPanelProps {
  gameState: GameState;
}

export default function GroupPanel({ gameState }: GroupPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', '/api/groups', data);
      return response.json();
    },
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
    mutationFn: async (groupId: number) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/join`, {});
      return response.json();
    },
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
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/groups/leave', {});
      return response.json();
    },
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

  if (!gameState?.character) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Группы
          </CardTitle>
          <CardDescription>
            Объединяйтесь с другими игроками для совместных приключений
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gameState.currentGroup ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{gameState.currentGroup.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Макс. участников: {gameState.currentGroup.maxMembers}
                  </p>
                </div>
                {gameState.currentGroup.leaderId === gameState.character.id && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Лидер
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={() => leaveGroupMutation.mutate()}
                disabled={leaveGroupMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Покинуть группу
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Название группы"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                />
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || createGroupMutation.isPending}
                >
                  Создать
                </Button>
              </div>

              {gameState.groupsInLocation && gameState.groupsInLocation.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Доступные группы:</h4>
                  {gameState.groupsInLocation.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Макс. участников: {group.maxMembers}
                        </div>
                      </div>
                      <Button 
                        onClick={() => joinGroupMutation.mutate(group.id)}
                        disabled={joinGroupMutation.isPending}
                        size="sm"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Вступить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
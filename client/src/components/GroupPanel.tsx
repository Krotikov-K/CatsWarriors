import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, UserPlus, LogOut, MapPin, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GameState, Character } from "@shared/schema";

interface GroupPanelProps {
  gameState: GameState;
}

export default function GroupPanel({ gameState }: GroupPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState("");

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', '/api/groups', {
        name: data.name,
        characterId: gameState.character?.id
      });
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

  const applyToGroupMutation = useMutation({
    mutationFn: async ({ groupId, message }: { groupId: number; message?: string }) => {
      const response = await apiRequest('POST', `/api/groups/${groupId}/apply`, {
        characterId: gameState.character?.id,
        message
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Заявка отправлена",
        description: "Ваша заявка на вступление в группу отправлена лидеру",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку",
        variant: "destructive",
      });
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/groups/leave', {
        characterId: gameState.character?.id
      });
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

  const respondToApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, response }: { applicationId: number; response: "accepted" | "rejected" }) => {
      const apiResponse = await apiRequest('POST', `/api/groups/applications/${applicationId}/respond`, {
        response
      });
      return apiResponse.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: variables.response === "accepted" ? "Заявка принята" : "Заявка отклонена",
        description: variables.response === "accepted" ? "Игрок принят в группу" : "Заявка отклонена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обработать заявку",
        variant: "destructive",
      });
    }
  });

  const kickMemberMutation = useMutation({
    mutationFn: async (targetCharacterId: number) => {
      const response = await apiRequest('POST', `/api/groups/${gameState.currentGroup?.id}/kick`, {
        characterId: gameState.character?.id,
        targetCharacterId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Участник исключён",
        description: "Игрок был исключён из группы",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось исключить игрока из группы",
        variant: "destructive",
      });
    }
  });

  // Get group members with their locations
  const { data: groupMembers } = useQuery({
    queryKey: ['/api/groups', gameState.currentGroup?.id, 'members'],
    queryFn: async (): Promise<(Character & { location?: { id: number; name: string; emoji: string } })[]> => {
      if (!gameState.currentGroup?.id) return [];
      const response = await apiRequest('GET', `/api/groups/${gameState.currentGroup.id}/members`);
      return response.json();
    },
    enabled: !!gameState.currentGroup?.id,
    refetchInterval: 5000 // Refresh every 5 seconds
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

              {/* Group Members */}
              {groupMembers && groupMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Участники группы ({groupMembers.length}/{gameState.currentGroup.maxMembers}):</h4>
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.name}
                            {member.id === gameState.currentGroup.leaderId && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                            <span className="text-xs">{member.gender === 'male' ? '🐱' : '🐈'}</span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {member.location ? `${member.location.emoji} ${member.location.name}` : "Неизвестная локация"}
                            <span className="ml-2">
                              {member.isOnline ? "🟢 В сети" : "⚫ Не в сети"}
                            </span>
                            {member.isOnline && (
                              <Badge variant="outline" className="ml-2">
                                HP: {member.currentHp}/{member.maxHp}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {gameState.currentGroup.leaderId === gameState.character.id && member.id !== gameState.character.id && (
                        <Button
                          onClick={() => kickMemberMutation.mutate(member.id)}
                          disabled={kickMemberMutation.isPending}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Group Applications for Leaders */}
              {gameState.currentGroup.leaderId === gameState.character.id && gameState.groupApplications && gameState.groupApplications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Заявки на вступление ({gameState.groupApplications.length}):</h4>
                  {gameState.groupApplications.map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-3 border rounded bg-blue-50 dark:bg-blue-950/20">
                      <div>
                        <div className="font-medium">Заявка от игрока</div>
                        <div className="text-sm text-muted-foreground">
                          {application.message || "Без сообщения"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => respondToApplicationMutation.mutate({ applicationId: application.id, response: "accepted" })}
                          disabled={respondToApplicationMutation.isPending}
                          size="sm"
                          variant="default"
                        >
                          Принять
                        </Button>
                        <Button 
                          onClick={() => respondToApplicationMutation.mutate({ applicationId: application.id, response: "rejected" })}
                          disabled={respondToApplicationMutation.isPending}
                          size="sm"
                          variant="outline"
                        >
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
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

              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Все группы ({gameState.allGroups?.length || 0}):
                </h4>
                {gameState.allGroups && gameState.allGroups.length > 0 ? (
                  gameState.allGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 border rounded bg-accent/30">
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Макс. участников: {group.maxMembers}
                          {group.leaderId === gameState.character?.id && " (Ваша группа)"}
                        </div>
                      </div>
                      {group.leaderId !== gameState.character?.id && (
                        <Button 
                          onClick={() => applyToGroupMutation.mutate({ groupId: group.id })}
                          disabled={applyToGroupMutation.isPending}
                          size="sm"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Подать заявку
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground p-3 border rounded bg-muted/30">
                    Пока нет групп
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
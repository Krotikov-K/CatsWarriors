import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Swords, AlertTriangle, Clock, Check, X, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Character, DiplomacyProposal } from "@shared/schema";

interface DiplomacyPanelProps {
  character: Character;
}

export default function DiplomacyPanel({ character }: DiplomacyPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: diplomacyData } = useQuery({
    queryKey: ["/api/diplomacy"],
    refetchInterval: 5000,
  });

  const { data: proposalsData } = useQuery({
    queryKey: ["/api/diplomacy/proposals"],
    refetchInterval: 3000,
  });

  const changeDiplomacyMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const fromClan = character.clan;
      const toClan = character.clan === "thunder" ? "river" : "thunder";
      
      const response = await apiRequest("POST", "/api/diplomacy/change", {
        fromClan,
        toClan,
        status,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/diplomacy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diplomacy/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-state"] });
      
      if (data.type === "proposal") {
        toast({
          title: "Предложение отправлено",
          description: "Предложение мира отправлено лидеру другого племени",
        });
      } else {
        toast({
          title: "Дипломатия изменена",
          description: "Отношения между племенами обновлены",
        });
      }
      setSelectedStatus("");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка дипломатии",
        description: error.message || "Не удалось изменить дипломатические отношения",
        variant: "destructive",
      });
    },
  });

  const respondToProposalMutation = useMutation({
    mutationFn: async ({ proposalId, response }: { proposalId: number; response: string }) => {
      const apiResponse = await apiRequest("POST", "/api/diplomacy/respond", {
        proposalId,
        response,
      });
      return apiResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diplomacy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diplomacy/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-state"] });
      toast({
        title: "Ответ отправлен",
        description: "Ваш ответ на дипломатическое предложение отправлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка ответа",
        description: error.message || "Не удалось отправить ответ",
        variant: "destructive",
      });
    },
  });

  const relations = diplomacyData?.relations || {};
  const proposals = proposalsData?.proposals || [];
  const fromClan = character.clan;
  const toClan = character.clan === "thunder" ? "river" : "thunder";
  const currentStatus = relations[fromClan]?.[toClan] || "peace";

  const statusConfig = {
    peace: {
      icon: Shield,
      label: "Мир",
      description: "Племена находятся в мирных отношениях",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      borderColor: "border-green-200 dark:border-green-800",
    },
    war: {
      icon: Swords,
      label: "Война",
      description: "Племена находятся в состоянии войны",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
    },
  };

  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig];
  const CurrentIcon = currentConfig.icon;

  const handleStatusChange = () => {
    if (selectedStatus && selectedStatus !== currentStatus) {
      changeDiplomacyMutation.mutate({ status: selectedStatus });
    }
  };

  const handleProposalResponse = (proposalId: number, response: string) => {
    respondToProposalMutation.mutate({ proposalId, response });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Дипломатия
        </CardTitle>
        <CardDescription>
          Управление отношениями между племенами (только для предводителей)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className={`p-4 rounded-lg border ${currentConfig.bgColor} ${currentConfig.borderColor}`}>
          <div className="flex items-center gap-3 mb-2">
            <CurrentIcon className={`h-5 w-5 ${currentConfig.color}`} />
            <div>
              <h3 className="font-semibold">
                Текущие отношения с {toClan === "thunder" ? "Грозовым" : "Речным"} племенем
              </h3>
              <p className={`text-sm font-medium ${currentConfig.color}`}>
                {currentConfig.label}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentConfig.description}
          </p>
        </div>

        {/* Change Status */}
        <div className="space-y-3">
          <h4 className="font-semibold">Изменить дипломатический статус</h4>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите новый статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peace">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    Мир
                  </div>
                </SelectItem>
                <SelectItem value="war">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-red-600" />
                    Война
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || selectedStatus === currentStatus || changeDiplomacyMutation.isPending}
              variant={selectedStatus === "war" ? "destructive" : "default"}
            >
              {changeDiplomacyMutation.isPending ? "Изменение..." : "Применить"}
            </Button>
          </div>
        </div>

        {/* Warning for War */}
        {selectedStatus === "war" && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Предупреждение
              </span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Объявление войны приведет к тому, что представители племен смогут сражаться друг с другом в любых локациях.
            </p>
          </div>
        )}

        {/* Diplomacy Proposals */}
        {proposals.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <h4 className="font-semibold">Дипломатические предложения</h4>
              <Badge variant="secondary">{proposals.length}</Badge>
            </div>
            <div className="space-y-2">
              {proposals.map((proposal: DiplomacyProposal) => (
                <div key={proposal.id} className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        Предложение мира от {proposal.fromClan === "thunder" ? "Грозового" : "Речного"} племени
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {proposal.message && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {proposal.message}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleProposalResponse(proposal.id, "accepted")}
                      disabled={respondToProposalMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProposalResponse(proposal.id, "rejected")}
                      disabled={respondToProposalMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Только предводители могут изменять дипломатические отношения</p>
          <p>• Предложения мира требуют согласия обеих сторон</p>
          <p>• Во время войны возможны сражения между племенами</p>
          <p>• Дипломатические изменения влияют на всех членов обоих племен</p>
        </div>
      </CardContent>
    </Card>
  );
}
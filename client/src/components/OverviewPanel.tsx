import { useState } from "react";
import { type Character, type Location, type NPC, NPCS_DATA, type Combat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Sword, Shield, Zap, Users, Leaf } from "lucide-react";
import NPCPanel from "./NPCPanel";
import TerritoryWarPanel from "./TerritoryWarPanel";
import PvPPanel from "./PvPPanel";
import GroupPanel from "./GroupPanel";
import CampActions from "./CampActions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OverviewPanelProps {
  character: Character;
  location: Location | null;
  playersInLocation: Character[];
  activeCombats?: Combat[];
  npcsInLocation?: NPC[];
}

interface GameState {
  character: Character;
  location: Location | null;
  playersInLocation: Character[];
  npcsInLocation: NPC[];
  activeCombats: Combat[];
  isInCombat: boolean;
  currentCombat: Combat | null;
  currentGroup: any;
}

export default function OverviewPanel({ character, location, playersInLocation, activeCombats = [], npcsInLocation: serverNpcs = [] }: OverviewPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState("npcs");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get NPCs in current location - use maxHp for health display and check respawnTime for death status
  const npcsInLocation = location ? NPCS_DATA.filter(npc => 
    Array.isArray(npc.spawnsInLocation) ? npc.spawnsInLocation.includes(location.id) : false
  ) : [];

  const liveNpcsInLocation = npcsInLocation;
  const deadNpcsInLocation: any[] = []; // Will be populated from server data later

  // Attack NPC handler
  const handleAttackNPC = (npcId: number, asGroup?: boolean) => {
    attackNPCMutation.mutate({ npcId, asGroup });
  };

  const attackNPCMutation = useMutation({
    mutationFn: async ({ npcId, asGroup }: { npcId: number; asGroup?: boolean }) => {
      const response = await apiRequest("POST", "/api/combat/attack-npc", {
        npcId,
        asGroup: asGroup || false
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Атака начата!",
        description: "Вы вступили в бой с NPC.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка атаки",
        description: error.message || "Не удалось атаковать NPC",
        variant: "destructive",
      });
    },
  });

  // Mock plants data for future implementation
  const plantsInLocation = location ? [
    { id: 1, name: "Кошачья мята", type: "healing", rarity: "common", description: "Успокаивает нервы" },
    { id: 2, name: "Паутинник", type: "healing", rarity: "uncommon", description: "Останавливает кровотечение" },
    { id: 3, name: "Тысячелистник", type: "healing", rarity: "rare", description: "Заживляет раны" }
  ].slice(0, Math.floor(Math.random() * 4)) : [];

  const renderNPCsTab = () => (
    <div className="space-y-4">
      {/* Active Combats */}
      {activeCombats.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-sm">⚔️ Активные бои</h4>
          <div className="space-y-2">
            {activeCombats.map((combat) => (
              <div key={combat.id} className="bg-red-100/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">Бой #{combat.id}</span>
                    <div className="text-xs text-muted-foreground">
                      Участников: {combat.participants?.length || 0} • Ход {combat.turn || 1}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">
                    Присоединиться
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use the original NPCPanel component */}
      <NPCPanel 
        npcs={liveNpcsInLocation}
        onAttackNPC={handleAttackNPC}
        canAttack={character.currentHp > 1}
        character={character}
        currentGroup={null}
      />
    </div>
  );

  const renderPlantsTab = () => (
    <div className="space-y-4">
      {plantsInLocation.length > 0 ? (
        <div>
          <h4 className="font-semibold mb-2 text-sm">🌿 Доступные растения</h4>
          <div className="space-y-2">
            {plantsInLocation.map((plant) => (
              <div key={plant.id} className="bg-green-100/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Leaf className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">{plant.name}</span>
                    <Badge 
                      variant={plant.rarity === 'rare' ? 'destructive' : plant.rarity === 'uncommon' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {plant.rarity === 'rare' ? 'Редкое' : plant.rarity === 'uncommon' ? 'Необычное' : 'Обычное'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{plant.description}</p>
                <Button size="sm" variant="outline" className="text-xs" disabled>
                  Собрать (скоро)
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Leaf className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">В этой локации нет растений</p>
          <p className="text-xs mt-1">Система сбора растений будет добавлена</p>
        </div>
      )}
    </div>
  );

  const renderPlayersTab = () => (
    <div className="space-y-4">
      {playersInLocation.length > 0 ? (
        <div>
          <h4 className="font-semibold mb-2 text-sm">👥 Игроки в локации</h4>
          <div className="space-y-2">
            {playersInLocation.map((player) => (
              <div key={player.id} className="bg-blue-100/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{player.gender === 'male' ? '🐱' : '🐈'}</span>
                    <span className="font-medium text-sm">{player.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Ур. {player.level}
                    </Badge>
                    <span className="text-xs">
                      {player.clan === 'thunder' ? '⚡' : '🌊'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-red-500" />
                    <span className="text-xs">{player.currentHp}/{player.maxHp}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {player.rank === 'leader' && '👑 Предводитель'}
                  {player.rank === 'deputy' && '⚔️ Глашатай'}
                  {player.rank === 'senior_healer' && '🌿 Старший целитель'}
                  {player.rank === 'healer' && '🍃 Целитель'}
                  {player.rank === 'healer_apprentice' && '🌱 Ученик целителя'}
                  {player.rank === 'senior_warrior' && '⚔️ Старший воитель'}
                  {player.rank === 'warrior' && '🗡️ Воитель'}
                  {player.rank === 'apprentice' && '🔰 Оруженосец'}
                  {player.rank === 'kitten' && '🐾 Котёнок'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">В этой локации нет других игроков</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Territory War Panel at the top */}
      <TerritoryWarPanel character={character} location={location} />

      {/* Groups Section - simplified for overview */}
      <div className="bg-card rounded-lg p-3">
        <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Группы
        </h4>
        <p className="text-xs text-muted-foreground">
          Для управления группами перейдите во вкладку "Племя"
        </p>
      </div>

      {/* Camp Actions */}
      {location && location.type === 'camp' && location.clan === character.clan && (
        <CampActions 
          character={character} 
          location={location}
        />
      )}

      {/* PvP Panel */}
      <PvPPanel 
        character={character}
        playersInLocation={playersInLocation}
        locationId={location?.id || 0}
      />

      {/* Location Info */}
      <div className="bg-card rounded-lg p-3">
        <h3 className="font-bold text-lg mb-2">📍 {location?.name || 'Неизвестная локация'}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>🎯 Уровень опасности: {location?.dangerLevel || 1}</span>
          <span>•</span>
          <span>👥 Игроков: {playersInLocation.length}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="npcs" className="text-xs">
            <Sword className="w-4 h-4 mr-1" />
            НПС
          </TabsTrigger>
          <TabsTrigger value="plants" className="text-xs">
            <Leaf className="w-4 h-4 mr-1" />
            Растения
          </TabsTrigger>
          <TabsTrigger value="players" className="text-xs">
            <Users className="w-4 h-4 mr-1" />
            Игроки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="npcs" className="space-y-4">
          {renderNPCsTab()}
        </TabsContent>

        <TabsContent value="plants" className="space-y-4">
          {renderPlantsTab()}
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          {renderPlayersTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
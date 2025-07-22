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

export default function OverviewPanel({ character, location, playersInLocation }: OverviewPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState("npcs");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get NPCs in current location
  const npcsInLocation = location ? NPCS_DATA.filter(npc => 
    npc.spawnsInLocation.includes(location.id) && !npc.isDead
  ) : [];

  const deadNpcsInLocation = location ? NPCS_DATA.filter(npc => 
    npc.spawnsInLocation.includes(location.id) && npc.isDead
  ) : [];

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
      {npcsInLocation.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-sm">🎯 Живые НПС</h4>
          <div className="space-y-2">
            {npcsInLocation.map((npc) => (
              <div key={npc.id} className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{npc.emoji}</span>
                    <span className="font-medium text-sm">{npc.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Ур. {npc.level}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-red-500" />
                    <span className="text-xs">{npc.health}</span>
                  </div>
                </div>
                <NPCPanel 
                  npc={npc} 
                  character={character}
                  onAttack={handleAttackNPC}
                  canAttack={character.currentHp > 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {deadNpcsInLocation.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-sm">💀 Мертвые НПС</h4>
          <div className="space-y-2">
            {deadNpcsInLocation.map((npc) => (
              <div key={npc.id} className="bg-red-100/20 rounded-lg p-3 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg grayscale">{npc.emoji}</span>
                    <span className="font-medium text-sm">{npc.name}</span>
                    <Badge variant="destructive" className="text-xs">
                      Мертв
                    </Badge>
                  </div>
                  {npc.respawnTime && (
                    <span className="text-xs text-muted-foreground">
                      Возродится через {Math.ceil((npc.respawnTime.getTime() - Date.now()) / 60000)} мин
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {npcsInLocation.length === 0 && deadNpcsInLocation.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Sword className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">В этой локации нет НПС</p>
        </div>
      )}
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
      <TerritoryWarPanel character={character} />

      {/* Groups Section */}
      <GroupPanel character={character} />

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
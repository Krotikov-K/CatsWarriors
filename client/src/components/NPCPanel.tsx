import { type NPC } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface NPCPanelProps {
  npcs: NPC[];
  onAttackNPC: (npcId: number) => void;
  canAttack: boolean;
}

export default function NPCPanel({ npcs, onAttackNPC, canAttack }: NPCPanelProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update timer every second for respawn countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRespawnTimeRemaining = (npc: NPC): number => {
    if (!npc.isDead || !npc.lastDeathTime || !npc.respawnTime) return 0;
    const timeElapsed = Math.floor((currentTime - new Date(npc.lastDeathTime).getTime()) / 1000);
    return Math.max(0, npc.respawnTime - timeElapsed);
  };
  if (npcs.length === 0) {
    return (
      <div className="bg-card rounded-lg p-4 text-center">
        <div className="text-muted-foreground mb-2">🌿</div>
        <p className="text-sm text-muted-foreground">В этой локации нет существ</p>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "enemy": return "bg-red-500";
      case "boss": return "bg-purple-500";
      case "neutral": return "bg-blue-500";
      case "quest": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "enemy": return "Враг";
      case "boss": return "Босс";
      case "neutral": return "Нейтральный";
      case "quest": return "Квестовый";
      default: return "Неизвестно";
    }
  };

  const getDifficultyColor = (level: number, playerLevel: number = 1) => {
    const diff = level - playerLevel;
    if (diff <= -2) return "text-gray-400"; // Очень легко
    if (diff <= 0) return "text-green-400"; // Легко
    if (diff <= 2) return "text-yellow-400"; // Нормально
    if (diff <= 4) return "text-orange-400"; // Сложно
    return "text-red-400"; // Очень сложно
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-3">Существа в локации ({npcs.length})</h3>
      
      {npcs.map((npc) => (
        <div key={npc.id} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center">
              <div className="text-2xl mr-3">{npc.emoji}</div>
              <div>
                <h4 className="font-semibold text-foreground">{npc.name}</h4>
                <p className="text-sm text-muted-foreground">{npc.description}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${getTypeColor(npc.type)} text-white text-xs`}>
                {getTypeName(npc.type)}
              </Badge>
              <span className={`text-sm font-medium ${getDifficultyColor(npc.level)}`}>
                Ур. {npc.level}
              </span>
            </div>
          </div>

          {/* Health Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Здоровье</span>
              <span className="font-medium">{npc.currentHp}/{npc.maxHp}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(npc.currentHp / npc.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">💪</div>
              <div className="text-sm font-medium">{npc.strength}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">⚡</div>
              <div className="text-sm font-medium">{npc.agility}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">🧠</div>
              <div className="text-sm font-medium">{npc.intelligence}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">🛡️</div>
              <div className="text-sm font-medium">{npc.endurance}</div>
            </div>
          </div>

          {/* Rewards */}
          {npc.experienceReward > 0 && (
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Награда: </span>
              <span className="text-xs font-medium text-yellow-400">
                {npc.experienceReward} опыта
              </span>
            </div>
          )}

          {/* Actions */}
          {npc.type === "enemy" || npc.type === "boss" ? (
            <Button 
              onClick={() => onAttackNPC(npc.id)}
              disabled={!canAttack || npc.isDead}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {npc.isDead ? (
                (() => {
                  const timeRemaining = getRespawnTimeRemaining(npc);
                  return timeRemaining > 0 ? 
                    `Возродится через ${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}` :
                    "Побежден";
                })()
              ) : "⚔️ Атаковать"}
            </Button>
          ) : npc.type === "neutral" ? (
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
            >
              💬 Поговорить
            </Button>
          ) : npc.type === "quest" ? (
            <Button 
              variant="outline"
              size="sm"
              className="w-full"
            >
              📋 Квест
            </Button>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              Нельзя взаимодействовать
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
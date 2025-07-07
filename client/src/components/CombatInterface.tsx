import { Combat, Character, NPC, CombatLogEntry } from "@/../../shared/schema";
import { getClanColor, getHealthColor, formatTime } from "@/lib/gameUtils";

interface CombatInterfaceProps {
  combat: Combat;
  character: Character;
  npcsInLocation: NPC[];
  playersInLocation: Character[];
}

interface CombatParticipant {
  id: number;
  name: string;
  type: 'character' | 'npc';
  currentHp: number;
  maxHp: number;
  level: number;
  clan?: string;
  emoji?: string;
  agility: number;
}

export default function CombatInterface({ 
  combat, 
  character, 
  npcsInLocation, 
  playersInLocation 
}: CombatInterfaceProps) {
  // Собираем всех участников боя
  const getParticipants = (): CombatParticipant[] => {
    const participants: CombatParticipant[] = [];
    
    // Добавляем персонажей
    combat.participants.forEach(participantId => {
      const player = playersInLocation.find(p => p.id === participantId);
      if (player) {
        participants.push({
          id: player.id,
          name: player.name,
          type: 'character',
          currentHp: player.currentHp,
          maxHp: player.maxHp,
          level: player.level,
          clan: player.clan,
          agility: player.agility
        });
      }
    });
    
    // Добавляем NPC
    combat.npcParticipants.forEach(npcId => {
      const npc = npcsInLocation.find(n => n.id === npcId);
      if (npc) {
        participants.push({
          id: npc.id,
          name: npc.name,
          type: 'npc',
          currentHp: npc.currentHp,
          maxHp: npc.maxHp,
          level: npc.level,
          emoji: npc.emoji,
          agility: npc.agility
        });
      }
    });
    
    // Сортируем по ловкости (быстрые первыми)
    return participants.sort((a, b) => b.agility - a.agility);
  };

  const participants = getParticipants();
  const currentTurnIndex = combat.currentTurn % participants.length;
  const activeParticipant = participants[currentTurnIndex];

  return (
    <div className="space-y-4">
      {/* Заголовок боя */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-red-600">⚔️ Активный бой</h2>
          <span className="text-sm text-muted-foreground">
            Ход {combat.currentTurn + 1}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Статус: {combat.isFinished ? 'Завершен' : 'Активен'} • Тип: {combat.type === 'pve' ? 'PvE' : 'PvP'}
        </div>
      </div>

      {/* Участники боя */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Участники боя</h3>
        <div className="space-y-3">
          {participants.map((participant, index) => {
            const isActive = activeParticipant?.id === participant.id;
            const healthPercent = (participant.currentHp / participant.maxHp) * 100;
            
            return (
              <div 
                key={`${participant.type}-${participant.id}`}
                className={`p-3 rounded-lg border transition-all ${
                  isActive 
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md' 
                    : 'border-border bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {participant.emoji && (
                      <span className="text-lg">{participant.emoji}</span>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.name}</span>
                        {participant.type === 'character' && participant.clan && (
                          <span 
                            className="text-xs px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: getClanColor(participant.clan),
                              color: 'white'
                            }}
                          >
                            {participant.clan === 'thunder' ? 'Грозовое' : 'Речное'}
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                            Ходит
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Уровень {participant.level} • Ловкость {participant.agility}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {participant.currentHp}/{participant.maxHp} HP
                    </div>
                  </div>
                </div>
                
                {/* Полоса здоровья */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${healthPercent}%`,
                      backgroundColor: getHealthColor(participant.currentHp, participant.maxHp)
                    }}
                  />
                </div>
                
                {participant.currentHp <= 0 && (
                  <div className="mt-2 text-sm text-red-500 font-medium">💀 Побежден</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Лог боя */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Журнал боя</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {combat.combatLog && combat.combatLog.length > 0 ? (
            combat.combatLog.map((entry: CombatLogEntry, index: number) => (
              <div 
                key={index} 
                className={`text-sm p-2 rounded border-l-4 ${
                  entry.type === 'attack' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                  entry.type === 'dodge' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                  entry.type === 'block' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  entry.type === 'damage' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                  'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="flex-1">{entry.message}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                {entry.damage && (
                  <div className="text-xs font-medium text-red-600 mt-1">
                    Урон: {entry.damage}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Журнал боя пуст. Ожидание начала сражения...
            </div>
          )}
        </div>
      </div>

      {/* Информация о следующем ходе */}
      {!combat.isFinished && activeParticipant && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="text-sm">
            <span className="font-medium">Следующий ход:</span> {activeParticipant.name}
            {activeParticipant.type === 'character' && activeParticipant.id === character.id && (
              <span className="ml-2 text-green-600 font-medium">(Ваш персонаж)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { type Combat, type Character } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CombatModalProps {
  combat: Combat;
  character: Character;
  onClose: () => void;
  onJoinCombat: (combatId: number) => void;
}

export default function CombatModal({ combat, character, onClose, onJoinCombat }: CombatModalProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (combat.status !== "active") {
      setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 3000); // Auto-close after 3 seconds when combat ends
    }
  }, [combat.status, onClose]);

  const isParticipant = combat.participants.includes(character.id);
  const canJoin = !isParticipant && combat.status === "active" && combat.participants.length < 4;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogEntryColor = (type: string) => {
    switch (type) {
      case "attack": return "text-red-300";
      case "dodge": return "text-blue-300";
      case "block": return "text-yellow-300";
      case "damage": return "text-purple-300";
      case "join": return "text-green-300";
      case "leave": return "text-gray-300";
      default: return "text-gray-400";
    }
  };

  return (
    <Dialog open={isVisible} onOpenChange={setIsVisible}>
      <DialogContent className="max-w-2xl bg-card-bg border-border-dark text-white">
        <DialogHeader>
          <DialogTitle className="font-gaming text-2xl font-bold text-combat flex items-center">
            <i className="fas fa-swords mr-2"></i>
            {combat.status === "active" ? "Битва в процессе" : "Битва завершена"}
          </DialogTitle>
        </DialogHeader>

        {/* Combat Participants */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {combat.participants.map((participantId, index) => (
            <div key={participantId} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mr-3">
                  <i className="fas fa-cat text-white"></i>
                </div>
                <div>
                  <h4 className="font-gaming font-semibold">
                    {participantId === character.id ? character.name : `Игрок ${participantId}`}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {participantId === character.id ? "Вы" : "Противник"}
                  </p>
                </div>
              </div>
              
              {/* Mock HP for demonstration */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(20, 100 - (index * 30))}%` }}
                ></div>
              </div>
              <div className="text-sm text-center font-stats">
                {Math.max(24, 120 - (index * 36))}/120 ХП
              </div>
            </div>
          ))}
        </div>

        {/* Combat Log */}
        <div className="mb-4">
          <h4 className="font-gaming font-semibold mb-2 text-white">Журнал боя</h4>
          <ScrollArea className="combat-log">
            <div className="text-sm space-y-1 font-mono">
              {combat.combatLog.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  Бой только начался...
                </div>
              ) : (
                combat.combatLog.map((entry, index) => (
                  <div key={index} className={getLogEntryColor(entry.type)}>
                    [{formatTime(entry.timestamp)}] {entry.message}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {canJoin && (
            <Button
              onClick={() => onJoinCombat(combat.id)}
              className="game-button-combat"
            >
              <i className="fas fa-sword mr-2"></i>
              Присоединиться к бою
            </Button>
          )}
          
          {isParticipant && combat.status === "active" && (
            <div className="text-center">
              <p className="text-green-300 font-gaming">
                <i className="fas fa-swords mr-2"></i>
                Вы участвуете в бою!
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Бой происходит автоматически
              </p>
            </div>
          )}

          <Button
            onClick={() => setIsVisible(false)}
            variant="outline"
            className="border-border-dark text-gray-300 hover:bg-gray-700"
          >
            {combat.status === "active" ? "Свернуть" : "Закрыть"}
          </Button>
        </div>

        {/* Combat Status */}
        {combat.status !== "active" && (
          <div className="text-center mt-4 p-4 bg-gray-800 rounded-lg">
            <p className="text-yellow-300 font-gaming text-lg">
              <i className="fas fa-flag-checkered mr-2"></i>
              Бой завершен!
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Результаты боя обработаны
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

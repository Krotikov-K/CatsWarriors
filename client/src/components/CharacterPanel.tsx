import { type Character, CLANS } from "@shared/schema";

interface CharacterPanelProps {
  character: Character;
}

export default function CharacterPanel({ character }: CharacterPanelProps) {
  const clan = CLANS[character.clan as keyof typeof CLANS];
  const hpPercentage = (character.currentHp / character.maxHp) * 100;
  const expPercentage = (character.experience / (character.level * 1000)) * 100;

  const getClanGradient = (clanKey: string) => {
    const gradients = {
      thunder: "from-green-400 to-green-600",
      shadow: "from-purple-400 to-purple-600",
      wind: "from-blue-400 to-blue-600",
      river: "from-cyan-400 to-cyan-600",
    };
    return gradients[clanKey as keyof typeof gradients] || "from-gray-400 to-gray-600";
  };

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center mb-4">
        {/* Character Avatar */}
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getClanGradient(character.clan)} flex items-center justify-center mr-4`}>
          <i className="fas fa-cat text-2xl text-white"></i>
        </div>
        
        {/* Character Info */}
        <div>
          <h3 className="font-gaming font-semibold text-lg text-white">
            {character.name}
          </h3>
          <div className="flex items-center text-sm text-gray-400">
            <span>{clan?.name || character.clan}</span>
            <span className="mx-2">•</span>
            <span>Уровень {character.level}</span>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">Здоровье</span>
          <span className="font-stats text-white">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
        <div className="health-bar">
          <div 
            className="health-bar-fill bg-green-500" 
            style={{ width: `${hpPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Experience Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-300">Опыт</span>
          <span className="font-stats text-white">
            {character.experience}/{character.level * 1000}
          </span>
        </div>
        <div className="health-bar">
          <div 
            className="health-bar-fill bg-blue-500" 
            style={{ width: `${expPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

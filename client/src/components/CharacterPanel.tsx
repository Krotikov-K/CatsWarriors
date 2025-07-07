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
          <span className="text-2xl text-white">🐱</span>
        </div>
        
        {/* Character Info */}
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            {character.name}
          </h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <span>{clan?.name || character.clan}</span>
            <span className="mx-2">•</span>
            <span>Уровень {character.level}</span>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Здоровье</span>
          <span className="font-bold text-foreground">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${hpPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Experience Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Опыт</span>
          <span className="font-bold text-foreground">
            {character.experience}/{character.level * 1000}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${expPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

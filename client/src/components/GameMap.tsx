import { type Location, type Character, type Combat, LOCATIONS_DATA } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GameMapProps {
  location: Location | null;
  character: Character;
  playersInLocation: Character[];
  activeCombats: Combat[];
  onLocationChange: (locationId: number) => void;
}

interface MapLocationProps {
  id: number;
  name: string;
  type: string;
  clan?: string | null;
  x: number;
  y: number;
  emoji: string;
  connectedTo: number[];
  isCurrentLocation: boolean;
  canMoveTo: boolean;
  playerCount: number;
  onClick: () => void;
}

function MapLocation({ 
  name, 
  type, 
  clan, 
  x, 
  y, 
  emoji,
  isCurrentLocation, 
  canMoveTo,
  playerCount,
  onClick 
}: MapLocationProps) {
  const getLocationColor = () => {
    if (clan) {
      switch (clan) {
        case "thunder": return "bg-gradient-to-br from-green-400 to-green-600";
        case "river": return "bg-gradient-to-br from-cyan-400 to-cyan-600";
      }
    }
    
    switch (type) {
      case "hunting": return "bg-gradient-to-br from-emerald-400 to-emerald-600";
      case "combat": return "bg-gradient-to-br from-red-400 to-red-600";
      case "sacred": return "bg-gradient-to-br from-indigo-400 to-indigo-600";
      case "neutral": return "bg-gradient-to-br from-yellow-400 to-yellow-600";
      default: return "bg-gradient-to-br from-gray-400 to-gray-600";
    }
  };

  const getBorderColor = () => {
    if (isCurrentLocation) return "border-white shadow-lg shadow-white/50";
    if (canMoveTo) return "border-green-300 hover:border-green-200";
    return "border-gray-500";
  };

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={canMoveTo ? onClick : undefined}
    >
      {/* Location Circle */}
      <div 
        className={`
          w-16 h-16 rounded-full border-3 ${getBorderColor()} ${getLocationColor()}
          flex items-center justify-center text-2xl
          ${canMoveTo ? 'hover:scale-110 hover:shadow-xl' : ''}
          ${isCurrentLocation ? 'scale-125 animate-pulse' : ''}
          ${!canMoveTo && !isCurrentLocation ? 'opacity-60' : ''}
        `}
      >
        {emoji}
      </div>
      
      {/* Location Name */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
        <div className="bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {name}
        </div>
        {playerCount > 0 && (
          <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded mt-1">
            {playerCount} 🐱
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameMap({ 
  location, 
  character, 
  playersInLocation, 
  activeCombats, 
  onLocationChange 
}: GameMapProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const moveCharacterMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const response = await apiRequest("POST", "/api/move", {
        characterId: character.id,
        locationId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state', character.id] });
      toast({
        title: "Перемещение выполнено",
        description: "Вы успешно переместились в новую локацию",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка перемещения",
        description: error.message || "Не удалось переместиться",
        variant: "destructive",
      });
    },
  });

  // Mock locations data - in real app this would come from API
  const locations = [
    { id: 1, name: "Лагерь Грозового Племени", type: "camp", clan: "thunder", playerCount: 12, combatCount: 1 },
    { id: 2, name: "Лагерь Теневого Племени", type: "camp", clan: "shadow", playerCount: 8, combatCount: 1 },
    { id: 3, name: "Лагерь Ветряного Племени", type: "camp", clan: "wind", playerCount: 15, combatCount: 2 },
    { id: 4, name: "Лагерь Речного Племени", type: "camp", clan: "river", playerCount: 6, combatCount: 0 },
    { id: 5, name: "Четыре Дерева", type: "neutral", clan: null, playerCount: 3, combatCount: 0 },
    { id: 6, name: "Тренировочная Поляна", type: "training", clan: null, playerCount: 7, combatCount: 2 },
    { id: 7, name: "Лунный Камень", type: "sacred", clan: null, playerCount: 2, combatCount: 0 },
    { id: 8, name: "Место Двуногих", type: "neutral", clan: null, playerCount: 1, combatCount: 0 },
  ];

  const handleLocationClick = (locationId: number) => {
    if (locationId === character.currentLocationId) return;
    
    moveCharacterMutation.mutate(locationId);
    onLocationChange(locationId);
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-xl p-4 md:p-6 relative overflow-hidden min-h-[500px]">
        {/* Background */}
        <div className="absolute inset-0 opacity-20">
          <div 
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            className="w-full h-full"
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="mb-6">
            <h3 className="font-gaming text-2xl font-bold mb-2 text-white">
              Территории Племен
            </h3>
            <p className="text-gray-400">
              Нажмите на локацию для перехода • Текущая локация: {location?.name}
            </p>
          </div>

          {/* Territory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
            {locations.map((loc) => (
              <LocationCard
                key={loc.id}
                id={loc.id}
                name={loc.name}
                type={loc.type}
                clan={loc.clan}
                playerCount={loc.playerCount}
                combatCount={loc.combatCount}
                isCurrentLocation={loc.id === character.currentLocationId}
                onClick={() => handleLocationClick(loc.id)}
              />
            ))}
          </div>

          {/* Map Legend */}
          <div className="bg-secondary bg-opacity-80 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-foreground">Легенда карты</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-gray-300">Мирные игроки</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-combat rounded-full mr-2 animate-pulse"></div>
                <span className="text-gray-300">В бою</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-300">Союзники</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                <span className="text-gray-300">Враги</span>
              </div>
            </div>
          </div>

          {/* Active players in location */}
          {playersInLocation.length > 0 && (
            <div className="mt-4 bg-secondary bg-opacity-80 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-foreground">
                Игроки в локации ({playersInLocation.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {playersInLocation.map((player) => (
                  <div 
                    key={player.id}
                    className="flex items-center text-sm p-2 bg-gray-700 rounded"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white truncate">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { type Location, type Character, type Combat } from "@shared/schema";
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

interface LocationCardProps {
  id: number;
  name: string;
  type: string;
  clan?: string | null;
  playerCount: number;
  combatCount: number;
  isCurrentLocation: boolean;
  onClick: () => void;
}

function LocationCard({ 
  name, 
  type, 
  clan, 
  playerCount, 
  combatCount, 
  isCurrentLocation, 
  onClick 
}: LocationCardProps) {
  const getLocationIcon = () => {
    switch (type) {
      case "camp": return "fas fa-home";
      case "training": return "fas fa-sword";
      case "sacred": return "fas fa-gem";
      case "neutral": return clan ? "fas fa-tree" : "fas fa-map-marker";
      default: return "fas fa-map-marker";
    }
  };

  const getLocationColor = () => {
    if (clan) {
      switch (clan) {
        case "thunder": return "border-green-500 bg-green-900";
        case "shadow": return "border-purple-500 bg-purple-900";
        case "wind": return "border-blue-500 bg-blue-900";
        case "river": return "border-cyan-500 bg-cyan-900";
      }
    }
    
    switch (type) {
      case "training": return "border-orange-500 bg-orange-900";
      case "sacred": return "border-indigo-500 bg-indigo-900";
      case "neutral": return "border-yellow-500 bg-yellow-900";
      default: return "border-gray-500 bg-gray-800";
    }
  };

  const getIconColor = () => {
    if (clan) {
      switch (clan) {
        case "thunder": return "text-green-400";
        case "shadow": return "text-purple-400";
        case "wind": return "text-blue-400";
        case "river": return "text-cyan-400";
      }
    }
    
    switch (type) {
      case "training": return "text-orange-400";
      case "sacred": return "text-indigo-400";
      case "neutral": return "text-yellow-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div 
      className={`territory-card ${getLocationColor()} bg-opacity-60 border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isCurrentLocation ? 'ring-2 ring-white ring-opacity-50' : 'hover:bg-opacity-80'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-3">
          <i className={`${getLocationIcon()} ${getIconColor()} text-2xl mr-3`}></i>
          <div>
            <h4 className="font-gaming font-bold text-white">{name}</h4>
            {isCurrentLocation && (
              <p className="text-xs text-green-300">Ваша текущая локация</p>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-end">
          <div className="w-full">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">Игроки:</span>
              <span className="font-stats text-white">{playerCount}</span>
            </div>
            
            {/* Player indicators */}
            <div className="flex space-x-1 flex-wrap">
              {Array.from({ length: Math.min(playerCount, 8) }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-3 h-3 rounded-full ${
                    i < combatCount ? 'bg-combat animate-pulse' : 'bg-blue-400'
                  }`}
                ></div>
              ))}
              {playerCount > 8 && (
                <span className="text-xs text-gray-400 ml-1">+{playerCount - 8}</span>
              )}
            </div>
          </div>
        </div>
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
    <div className="flex-1 p-6 overflow-auto">
      <div className="h-full bg-card-bg rounded-xl p-6 relative overflow-hidden">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <div className="bg-gray-800 bg-opacity-80 rounded-lg p-4">
            <h4 className="font-gaming font-semibold mb-3 text-white">Легенда карты</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
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
            <div className="mt-6 bg-gray-800 bg-opacity-80 rounded-lg p-4">
              <h4 className="font-gaming font-semibold mb-3 text-white">
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

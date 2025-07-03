import { type Location, type Character, type Combat, LOCATIONS_DATA } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MapViewProps {
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
  connectedTo: readonly number[];
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

export default function MapView({ 
  location, 
  character, 
  playersInLocation, 
  activeCombats, 
  onLocationChange 
}: MapViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const moveCharacterMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const response = await apiRequest("POST", "/api/move", {
        characterId: character.id,
        locationId
      });
      if (!response.ok) {
        throw new Error("Failed to move character");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
      toast({
        title: "Перемещение успешно!",
        description: "Ваш персонаж перемещен в новую локацию.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка перемещения",
        description: "Не удалось переместить персонажа.",
        variant: "destructive",
      });
    },
  });

  const getPlayerCountForLocation = (locationId: number) => {
    return playersInLocation.filter(p => p.currentLocationId === locationId).length;
  };

  const getCurrentLocationData = () => {
    return LOCATIONS_DATA.find(loc => loc.id === character.currentLocationId);
  };

  const canMoveToLocation = (locationId: number) => {
    const currentLocationData = getCurrentLocationData();
    if (!currentLocationData) return false;
    return (currentLocationData.connectedTo as readonly number[]).includes(locationId);
  };

  const handleLocationClick = (locationId: number) => {
    if (locationId === character.currentLocationId) return;
    if (!canMoveToLocation(locationId)) {
      toast({
        title: "Нельзя перейти",
        description: "Эта локация недоступна отсюда.",
        variant: "destructive",
      });
      return;
    }
    
    moveCharacterMutation.mutate(locationId);
    onLocationChange(locationId);
  };

  const renderPath = (from: any, to: any) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    return (
      <div
        key={`path-${from.id}-${to.id}`}
        className="absolute border-t-2 border-dashed border-gray-400 opacity-50"
        style={{
          left: `${from.x}%`,
          top: `${from.y}%`,
          width: `${length * 0.8}%`,
          transformOrigin: '0 0',
          transform: `rotate(${angle}deg)`,
          zIndex: 1
        }}
      />
    );
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-xl p-4 md:p-6 relative overflow-hidden min-h-[600px]">
        {/* Background */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="w-full h-full bg-gradient-to-br from-green-900 via-yellow-900 to-cyan-900"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(101, 163, 13, 0.2) 0%, transparent 50%)
              `
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2 text-foreground">
              🗺️ Карта Территорий
            </h3>
            <p className="text-muted-foreground">
              Текущая локация: {location?.name || 'Неизвестно'} • Доступны только связанные локации
            </p>
          </div>

          {/* Map Container */}
          <div className="relative w-full h-96 bg-black bg-opacity-20 rounded-lg border border-border">
            {/* Render paths between connected locations */}
            {LOCATIONS_DATA.map(loc => 
              loc.connectedTo.map(connectedId => {
                const connectedLoc = LOCATIONS_DATA.find(l => l.id === connectedId);
                if (!connectedLoc || connectedLoc.id < loc.id) return null; // Avoid duplicate paths
                return renderPath(loc, connectedLoc);
              })
            ).flat()}

            {/* Render locations */}
            {LOCATIONS_DATA.map((loc) => (
              <MapLocation
                key={loc.id}
                id={loc.id}
                name={loc.name}
                type={loc.type}
                clan={loc.clan}
                x={loc.x}
                y={loc.y}
                emoji={loc.emoji}
                connectedTo={loc.connectedTo as readonly number[]}
                isCurrentLocation={loc.id === character.currentLocationId}
                canMoveTo={canMoveToLocation(loc.id)}
                playerCount={getPlayerCountForLocation(loc.id)}
                onClick={() => handleLocationClick(loc.id)}
              />
            ))}
          </div>

          {/* Map Legend */}
          <div className="mt-6 bg-secondary bg-opacity-80 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-foreground">Легенда карты</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 mr-2"></div>
                <span className="text-muted-foreground">Грозовое племя</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 mr-2"></div>
                <span className="text-muted-foreground">Речное племя</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 mr-2"></div>
                <span className="text-muted-foreground">Охота</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 mr-2"></div>
                <span className="text-muted-foreground">Бой</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Белая граница — ваша локация • Зеленая граница — доступно для перехода
            </div>
          </div>

          {/* Current location info */}
          {playersInLocation.length > 0 && (
            <div className="mt-4 bg-secondary bg-opacity-80 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-foreground">
                Игроки в локации ({playersInLocation.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {playersInLocation.slice(0, 6).map((player) => (
                  <div key={player.id} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <span className="text-muted-foreground">{player.name}</span>
                  </div>
                ))}
                {playersInLocation.length > 6 && (
                  <div className="text-xs text-muted-foreground">
                    и еще {playersInLocation.length - 6}...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
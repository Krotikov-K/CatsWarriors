import { type Location, type Character, type Combat, LOCATIONS_DATA } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  ownerClan?: string;
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
  ownerClan,
  onClick 
}: MapLocationProps) {
  const getLocationColor = () => {
    // Tribal camps always keep their original colors
    if (type === "camp") {
      if (clan === "thunder") return "bg-gradient-to-br from-yellow-500 to-yellow-600";
      if (clan === "river") return "bg-gradient-to-br from-blue-500 to-blue-600";
    }
    
    // Territory ownership colors
    if (ownerClan) {
      if (ownerClan === "thunder") return "bg-gradient-to-br from-yellow-300 to-yellow-500";
      if (ownerClan === "river") return "bg-gradient-to-br from-blue-300 to-blue-500";
    }
    
    // Default neutral color (gray)
    return "bg-gradient-to-br from-gray-400 to-gray-600";
  };

  const getBorderColor = () => {
    if (isCurrentLocation) return "border-white shadow-lg shadow-white/50";
    if (canMoveTo) return "border-green-300 hover:border-green-200";
    return "border-gray-500";
  };

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={canMoveTo ? onClick : undefined}
    >
      {/* Location Circle */}
      <div 
        className={`
          w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full border-2 md:border-3 ${getBorderColor()} ${getLocationColor()}
          flex items-center justify-center text-lg md:text-2xl lg:text-3xl
          ${canMoveTo ? 'hover:scale-110 hover:shadow-xl active:scale-95' : ''}
          ${isCurrentLocation ? 'scale-110 md:scale-125 animate-pulse' : ''}
          ${!canMoveTo && !isCurrentLocation ? 'opacity-60' : ''}
          transition-all duration-200 relative z-10
        `}
      >
        {emoji}
      </div>
      
      {/* Location Name - Only for camps */}
      {(type === "camp") && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 md:mt-2 text-center z-10">
          <div className="bg-black bg-opacity-90 text-white text-xs md:text-sm lg:text-base px-2 py-1 rounded whitespace-nowrap max-w-28 md:max-w-36 lg:max-w-48 overflow-hidden">
            <span className="text-xs md:text-sm lg:text-base block truncate">{name}</span>
          </div>
        </div>
      )}
      {/* Player count for all locations */}
      {playerCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs md:text-sm lg:text-base px-1 md:px-2 py-0.5 md:py-1 rounded-full z-10 min-w-[1.25rem] md:min-w-[1.5rem] lg:min-w-[2rem] text-center">
          {playerCount}
        </div>
      )}
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

  // Fetch territory ownership data
  const { data: territoryOwnership } = useQuery<{ territories: Array<{ locationId: number; ownerClan: string }> }>({
    queryKey: ['/api/territory/ownership'],
  });

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
    // Calculate circle radius in percentage units (approximately 3% for mobile, 4% for desktop)
    const circleRadius = 2.5;
    
    // Calculate direction vector
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate start and end points at edge of circles
    const startX = from.x + dirX * circleRadius;
    const startY = from.y + dirY * circleRadius;
    const endX = to.x - dirX * circleRadius;
    const endY = to.y - dirY * circleRadius;
    
    return (
      <svg
        key={`path-${from.id}-${to.id}`}
        className="absolute pointer-events-none"
        style={{
          left: '0%',
          top: '0%',
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
      >
        <line
          x1={`${startX}%`}
          y1={`${startY}%`}
          x2={`${endX}%`}
          y2={`${endY}%`}
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.6"
        />
      </svg>
    );
  };

  return (
    <div className="w-full h-full min-h-[600px]">
      <div className="bg-card rounded-xl p-3 md:p-6 relative overflow-hidden flex flex-col min-h-[600px]">
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
        <div className="relative z-10 flex flex-col h-full min-h-[600px]">
          {/* Header - Mobile Optimized */}
          <div className="mb-3 flex-shrink-0">
            <h3 className="text-lg font-bold mb-2 text-foreground">
              🗺️ Карта
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs bg-secondary px-2 py-1 rounded">
                {character.clan === 'thunder' ? '⚡ Грозовое' : '🌊 Речное'}
              </span>
              <span>•</span>
              <span className="truncate">{location?.name || 'Неизвестно'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Нажмите на зеленые локации для перехода
            </p>
          </div>

          {/* Map Container - Horizontal Scroll */}
          <div className="relative w-full flex-1 bg-gradient-to-br from-green-900/20 via-yellow-900/20 to-cyan-900/20 rounded-lg border border-border min-h-[400px] md:min-h-[500px] lg:min-h-[600px] mb-4 overflow-x-auto overflow-y-hidden">
            {/* Extended Map Area */}
            <div 
              className="relative h-full bg-red-500/10 border border-red-500" 
              style={{ 
                width: '800px',
                minWidth: '800px',
                height: '400px'
              }}
            >
              {/* Render paths between connected locations - LOWER Z-INDEX */}
              {LOCATIONS_DATA.map(loc => 
                loc.connectedTo.map(connectedId => {
                  const connectedLoc = LOCATIONS_DATA.find(l => l.id === connectedId);
                  if (!connectedLoc || connectedLoc.id < loc.id) return null; // Avoid duplicate paths
                  return renderPath(loc, connectedLoc);
                })
              ).flat()}

              {/* Debug info */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-80 text-white text-xs p-2 rounded z-50">
                Locations: {LOCATIONS_DATA.length} | Current: {character.currentLocationId}
              </div>
              
              {/* Render locations - HIGHER Z-INDEX */}
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
                  ownerClan={territoryOwnership?.territories?.find(t => t.locationId === loc.id)?.ownerClan}
                  onClick={() => handleLocationClick(loc.id)}
                />
              ))}
            </div>
          </div>

          {/* Map Legend - Mobile Optimized */}
          <div className="flex-shrink-0">
            <div className="bg-secondary bg-opacity-80 rounded-lg p-2">
              <h4 className="font-semibold mb-2 text-xs text-foreground">Легенда</h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mr-2"></div>
                  <span className="text-muted-foreground">Грозовое</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mr-2"></div>
                  <span className="text-muted-foreground">Речное</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 mr-2"></div>
                  <span className="text-muted-foreground">Нейтральные</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 mr-2"></div>
                  <span className="text-muted-foreground">Охота</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 mr-2"></div>
                  <span className="text-muted-foreground">Бой</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Белая граница — ваша локация • Зеленая граница — доступно
              </div>
            </div>

            {/* Current location info */}
            {playersInLocation.length > 0 && (
              <div className="bg-secondary bg-opacity-80 rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm text-foreground">
                  Игроки здесь ({playersInLocation.length})
                </h4>
                <div className="grid grid-cols-2 gap-1">
                  {playersInLocation.slice(0, 4).map((player) => (
                    <div key={player.id} className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground truncate">{player.name}</span>
                    </div>
                  ))}
                  {playersInLocation.length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      +{playersInLocation.length - 4} еще...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
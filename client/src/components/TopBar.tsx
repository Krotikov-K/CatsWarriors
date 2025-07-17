import { type Location } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  location: Location | null;
  playersOnline: number;
}

export default function TopBar({ location, playersOnline }: TopBarProps) {
  const handleNotificationsClick = () => {
    console.log("Toggle notifications");
  };

  const handleSettingsClick = () => {
    console.log("Show settings");
  };

  return (
    <div className="h-16 bg-card-bg border-b border-border-dark flex items-center justify-between px-6">
      <div className="flex items-center">
        <h2 className="font-gaming text-xl font-semibold text-white">
          {location?.name || "Неизвестная локация"}
        </h2>
        <div className="ml-4 text-sm text-gray-400">
          <i className="fas fa-users mr-1"></i>
          <span>{playersOnline} игроков в локации</span>
          {import.meta.env.DEV && (
            <div className="ml-4 space-x-2">
              <a href="?userId=1" className="underline text-amber-400 hover:text-amber-300">
                Кисяо
              </a> | 
              <a href="?userId=3" className="underline text-blue-400 hover:text-blue-300">
                Админ
              </a>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNotificationsClick}
          className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
        >
          <i className="fas fa-bell"></i>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettingsClick}
          className="p-2 hover:bg-gray-700 text-gray-400 hover:text-white"
        >
          <i className="fas fa-cog"></i>
        </Button>
      </div>
    </div>
  );
}

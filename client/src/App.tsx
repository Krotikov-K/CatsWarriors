import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GameDashboard from "@/pages/GameDashboard";
import CharacterCreation from "@/pages/CharacterCreation";
import NotFound from "@/pages/not-found";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";

function Router() {
  const [location, navigate] = useLocation();
  const { user, isInitialized, hapticFeedback } = useTelegramWebApp();
  
  // Check if user has a character
  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['/api/characters'],
    queryFn: async () => {
      const res = await fetch('/api/characters');
      if (!res.ok) {
        throw new Error('Failed to fetch characters');
      }
      return res.json();
    },
    enabled: isInitialized, // Only fetch when Telegram is initialized
  });

  useEffect(() => {
    if (!isLoading && isInitialized) {
      if (characters.length === 0 && location !== '/create-character') {
        hapticFeedback('light');
        navigate('/create-character');
      } else if (characters.length > 0 && location === '/create-character') {
        hapticFeedback('light');
        navigate('/');
      }
    }
  }, [isLoading, characters, location, navigate, isInitialized, hapticFeedback]);

  // Show welcome screen if not initialized (for development)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Cats War
          </h1>
          <p className="text-muted-foreground">
            Откройте игру через Telegram бот для полного функционала
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={GameDashboard} />
      <Route path="/create-character" component={CharacterCreation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen tg-web-app safe-area-inset bg-background text-foreground">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

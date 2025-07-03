import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GameDashboard from "@/pages/GameDashboard";
import CharacterCreation from "@/pages/CharacterCreation";
import NotFound from "@/pages/not-found";
import { useTelegramWebApp } from "./hooks/useTelegramWebApp";
import { useUser } from "./hooks/useUser";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";

function Router() {
  const [location, navigate] = useLocation();
  const { hapticFeedback } = useTelegramWebApp();
  const { user, isLoading: userLoading } = useUser();
  
  // Check if user has a character
  const { data: characters = [], isLoading: charactersLoading } = useQuery({
    queryKey: ['/api/characters', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/characters?userId=${user?.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch characters');
      }
      return res.json();
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  const isLoading = userLoading || charactersLoading;

  useEffect(() => {
    if (!isLoading && user) {
      if (characters.length === 0 && location !== '/create-character') {
        hapticFeedback('light');
        navigate('/create-character');
      } else if (characters.length > 0 && location === '/create-character') {
        hapticFeedback('light');
        navigate('/');
      }
    }
  }, [isLoading, characters, location, navigate, user, hapticFeedback]);

  // Show welcome screen if user not loaded (for development)
  if (!user) {
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

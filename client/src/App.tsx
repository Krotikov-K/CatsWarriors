import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";
import GameDashboard from "@/pages/GameDashboard";
import CharacterCreation from "@/pages/CharacterCreation";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

function App() {
  console.log('App starting...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Switch>
          <Route path="/create-character" component={CharacterCreation} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/" component={GameDashboard} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
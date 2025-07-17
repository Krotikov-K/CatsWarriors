import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";
import GameDashboard from "@/pages/GameDashboard";
import CharacterCreation from "@/pages/CharacterCreation";
import SimpleAdminPanel from "@/pages/SimpleAdminPanel";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/not-found";
import { DevUserSwitcher } from "@/components/DevUserSwitcher";

function App() {
  console.log('App starting...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <DevUserSwitcher />
        <Switch>
          <Route path="/create-character" component={CharacterCreation} />
          <Route path="/admin-login" component={AdminLogin} />
          <Route path="/admin-panel" component={SimpleAdminPanel} />
          <Route path="/admin" component={SimpleAdminPanel} />
          <Route path="/" component={GameDashboard} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
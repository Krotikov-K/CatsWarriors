import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import GameDashboard from "@/pages/GameDashboard";

function App() {
  console.log('App starting...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <GameDashboard />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
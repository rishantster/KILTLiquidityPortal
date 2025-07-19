import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import NotFound from "@/pages/not-found";
import HomeSimple from "@/pages/home-simple";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeSimple} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <div className="min-h-screen bg-black text-white">
            <Router />
            <Toaster />
          </div>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkProvider } from "@/contexts/network";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Trades from "@/pages/trades";
import Skipped from "@/pages/skipped";
import Tokens from "@/pages/tokens";
import Portfolio from "@/pages/portfolio";
import Alerts from "@/pages/alerts";
import History from "@/pages/history";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trades" component={Trades} />
      <Route path="/skipped" component={Skipped} />
      <Route path="/tokens" component={Tokens} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NetworkProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </NetworkProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

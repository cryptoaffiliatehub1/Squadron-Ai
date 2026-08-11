import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkProvider } from "@/contexts/network";
import { TradingModeProvider } from "@/contexts/trading-mode";
import { BotProvider } from "@/contexts/bot";
import NotFound from "@/pages/not-found";

const Dashboard  = lazy(() => import("@/pages/dashboard"));
const Trades     = lazy(() => import("@/pages/trades"));
const Skipped    = lazy(() => import("@/pages/skipped"));
const Tokens     = lazy(() => import("@/pages/tokens"));
const Portfolio  = lazy(() => import("@/pages/portfolio"));
const Alerts     = lazy(() => import("@/pages/alerts"));
const History    = lazy(() => import("@/pages/history"));
const Simulation = lazy(() => import("@/pages/simulation"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/trades" component={Trades} />
        <Route path="/skipped" component={Skipped} />
        <Route path="/tokens" component={Tokens} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/history" component={History} />
        <Route path="/simulation" component={Simulation} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NetworkProvider>
          <TradingModeProvider>
            <BotProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </BotProvider>
          </TradingModeProvider>
        </NetworkProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

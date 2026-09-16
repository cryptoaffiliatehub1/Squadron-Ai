import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BotStatus {
  isRunning: boolean;
  scannerOnline: boolean;   // Fix 8: true when triple-radar scanner has at least one successful scan
  conservativeMode: boolean;
  tradesExecutedToday: number;
  network?: string;
}

interface BotContextValue {
  isRunning: boolean;
  scannerOnline: boolean;   // Fix 8
  botData: BotStatus | null;
  network: string;
  toggleBot: (running: boolean) => void;
  isPending: boolean;
  isLoading: boolean;
}

const BotContext = createContext<BotContextValue>({
  isRunning: false,
  scannerOnline: false,
  botData: null,
  network: "mainnet",
  toggleBot: () => {},
  isPending: false,
  isLoading: true,
});

export function BotProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<BotStatus>({
    queryKey: ["bot-status"],
    queryFn: () => fetch("/api/bot/status").then(r => r.json()),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: (running: boolean) =>
      fetch("/api/bot/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ running }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot-status"] }),
  });

  return (
    <BotContext.Provider
      value={{
        isRunning: data?.isRunning ?? false,
        scannerOnline: data?.scannerOnline ?? false,   // Fix 8
        botData: data ?? null,
        network: (data as any)?.network ?? "mainnet",
        toggleBot: (running) => mutation.mutate(running),
        isPending: mutation.isPending,
        isLoading,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  return useContext(BotContext);
}

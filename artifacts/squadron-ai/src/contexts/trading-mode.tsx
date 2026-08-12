import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type TradingModeValue = "paper" | "live";

interface TradingModeState {
  mode: TradingModeValue;
  switchedAt: string;
  isPaper: boolean;
  isLive: boolean;
}

interface TradingModeContextValue extends TradingModeState {
  setMode: (mode: TradingModeValue) => Promise<void>;
  isLoading: boolean;
  isSwitching: boolean;
}

const TradingModeContext = createContext<TradingModeContextValue>({
  mode: "paper",
  switchedAt: "",
  isPaper: true,
  isLive: false,
  setMode: async () => {},
  isLoading: false,
  isSwitching: false,
});

export function TradingModeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ mode: TradingModeValue; switchedAt: string }>({
    queryKey: ["trading-mode"],
    queryFn: () => fetch("/api/trading-mode").then((r) => r.json()),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: (mode: TradingModeValue) =>
      fetch("/api/trading-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trading-mode"] }),
  });

  const setMode = useCallback(
    async (mode: TradingModeValue) => {
      await mutation.mutateAsync(mode);
    },
    [mutation],
  );

  const mode: TradingModeValue = data?.mode ?? "paper";

  return (
    <TradingModeContext.Provider
      value={{
        mode,
        switchedAt: data?.switchedAt ?? "",
        isPaper: mode === "paper",
        isLive: mode === "live",
        setMode,
        isLoading,
        isSwitching: mutation.isPending,
      }}
    >
      {children}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  return useContext(TradingModeContext);
}

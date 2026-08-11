import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface NetworkContextValue {
  network: string;
  isMainnet: boolean;
  setNetwork: (n: string) => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: "mainnet",
  setNetwork: () => {},
  isMainnet: true,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["bot-status"],
    queryFn: () => fetch("/api/bot/status").then(r => r.json()),
    refetchInterval: 10000,
    staleTime: 0,
  });

  const network = (data as any)?.network ?? "mainnet";

  return (
    <NetworkContext.Provider
      value={{ network, setNetwork: () => {}, isMainnet: network === "mainnet" }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

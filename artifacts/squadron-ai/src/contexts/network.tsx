import { createContext, useContext, useState, type ReactNode } from "react";

type Network = "mainnet" | "devnet";

interface NetworkContextValue {
  network: Network;
  setNetwork: (n: Network) => void;
  isMainnet: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: "devnet",
  setNetwork: () => {},
  isMainnet: false,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>("devnet");
  return (
    <NetworkContext.Provider value={{ network, setNetwork, isMainnet: network === "mainnet" }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

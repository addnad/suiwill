"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { createContext, useContext, useState, useEffect } from "react";

const queryClient = new QueryClient();

const TATUM_KEY = "t-65a7c7b760fded001ccd19d3-de68f6cb571143d58ea5c811";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: "https://fullnode.mainnet.sui.io:443" },
  testnet: { url: "https://fullnode.testnet.sui.io:443" },
});

const PACKAGE_IDS: Record<string, string> = {
  testnet: process.env.NEXT_PUBLIC_TESTNET_PACKAGE_ID ?? "",
  mainnet: process.env.NEXT_PUBLIC_MAINNET_PACKAGE_ID ?? "",
};

type Network = "testnet" | "mainnet";

interface NetworkContextType {
  network: Network;
  setNetwork: (n: Network) => void;
  packageId: string;
}

export const NetworkContext = createContext<NetworkContextType>({
  network: "testnet",
  setNetwork: () => {},
  packageId: PACKAGE_IDS["testnet"],
});

export const useNetwork = () => useContext(NetworkContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState<Network>("testnet");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("suiwill-network") as Network;
    if (saved === "mainnet" || saved === "testnet") setNetwork(saved);
    setHydrated(true);
  }, []);

  const handleSetNetwork = (n: Network) => {
    localStorage.setItem("suiwill-network", n);
    setNetwork(n);
  };

  if (!hydrated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkContext.Provider value={{ network, setNetwork: handleSetNetwork, packageId: PACKAGE_IDS[network] }}>
        <SuiClientProvider networks={networkConfig} network={network}>
          <WalletProvider autoConnect>
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </NetworkContext.Provider>
    </QueryClientProvider>
  );
}

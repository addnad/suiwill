"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

const TATUM_KEY = "t-65a7c7b760fded001ccd19d3-de68f6cb571143d58ea5c811";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: `https://sui-mainnet.gateway.tatum.io/${TATUM_KEY}` },
  testnet: { url: `https://sui-testnet.gateway.tatum.io/${TATUM_KEY}` },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

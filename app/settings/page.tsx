"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/wallet-button";
import { useWillId } from "@/hooks/use-will";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUIWILL_PACKAGE_ID!;

export default function SettingsPage() {
  const account = useCurrentAccount();
  const { willId } = useWillId();

  const { data: balanceData } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "" },
    { enabled: !!account?.address }
  );

  const suiBalance = balanceData
    ? (parseInt(balanceData.totalBalance) / 1_000_000_000).toFixed(4)
    : "—";

  return (
    <DashboardPageLayout
      header={{
        title: "Settings",
        description: account ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect wallet to view settings",
        icon: GearIcon,
      }}
    >
      <div className="flex flex-col gap-6">

        {/* Wallet */}
        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">CONNECTED WALLET</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "ADDRESS", value: account?.address ?? "Not connected", mono: true },
              { label: "BALANCE", value: `${suiBalance} SUI`, mono: true },
              { label: "NETWORK", value: "Sui Testnet", mono: false },
              { label: "STATUS", value: account ? "CONNECTED" : "DISCONNECTED", mono: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <span className="font-mono text-[10px] text-muted-foreground">{item.label}</span>
                <span className={`text-xs text-foreground truncate max-w-[60%] text-right ${item.mono ? "font-mono" : ""}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <WalletButton />
          </div>
        </div>

        {/* Will */}
        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">SUIWILL CONTRACT</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "PACKAGE ID", value: PACKAGE_ID },
              { label: "YOUR WILL ID", value: willId ?? "No will deployed" },
              { label: "NETWORK", value: "Sui Testnet" },
              { label: "CLOCK OBJECT", value: "0x6" },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between py-2 border-b border-border last:border-b-0 gap-4">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.label}</span>
                <span className="font-mono text-xs text-foreground truncate text-right">{item.value}</span>
              </div>
            ))}
          </div>
          {willId && (
            <a
              href={`https://suiscan.xyz/testnet/object/${willId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full block text-center font-mono text-xs tracking-widest border border-border py-3 hover:border-primary hover:text-primary transition-colors rounded-md"
            >
              VIEW WILL ON SUI EXPLORER ↗
            </a>
          )}
          {!willId && (
            <a
              href="/create"
              className="mt-4 w-full block text-center font-mono text-xs tracking-widest bg-primary text-primary-foreground py-3 hover:bg-primary/90 transition-colors rounded-md"
            >
              CREATE YOUR WILL →
            </a>
          )}
        </div>

        {/* About */}
        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">ABOUT SUIWILL</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "VERSION", value: "1.0.0" },
              { label: "BUILT FOR", value: "Sui Overflow 2026" },
              { label: "TRACKS", value: "Agentic Web + Walrus" },
              { label: "LICENSE", value: "MIT" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-border last:border-b-0">
                <span className="font-mono text-[10px] text-muted-foreground">{item.label}</span>
                <span className="font-mono text-xs text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardPageLayout>
  );
}

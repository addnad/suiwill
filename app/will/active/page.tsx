"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useWillId } from "@/hooks/use-will";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { WalletButton } from "@/components/wallet-button";

export default function WillActivePage() {
  const account = useCurrentAccount();
  const router = useRouter();
  const { willId, isLoading } = useWillId();

  useEffect(() => {
    if (willId) {
      router.replace(`/will/${willId}`);
    }
  }, [willId, router]);

  if (!account) {
    return (
      <DashboardPageLayout
        header={{ title: "My Will", description: "Connect wallet", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <h2 className="font-display text-4xl tracking-widest uppercase">CONNECT WALLET</h2>
          <div className="w-48"><WalletButton /></div>
        </div>
      </DashboardPageLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardPageLayout
        header={{ title: "My Will", description: "Loading...", icon: ProcessorIcon }}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">
            QUERYING CHAIN...
          </p>
        </div>
      </DashboardPageLayout>
    );
  }

  if (!willId) {
    return (
      <DashboardPageLayout
        header={{ title: "My Will", description: "No will found", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
          <h2 className="font-display text-4xl tracking-widest uppercase">NO WILL FOUND</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            You have not deployed a SuiWill contract yet.
          </p>
          <a
            href="/create"
            className="px-6 py-3 bg-primary text-primary-foreground font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors rounded-md"
          >
            CREATE YOUR WILL
          </a>
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout
      header={{ title: "My Will", description: "Redirecting...", icon: ProcessorIcon }}
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">
          LOADING WILL...
        </p>
      </div>
    </DashboardPageLayout>
  );
}

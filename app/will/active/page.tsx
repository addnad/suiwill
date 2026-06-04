"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useWillId } from "@/hooks/use-will";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { WalletButton } from "@/components/wallet-button";
import { Badge } from "@/components/ui/badge";
import { useNetwork } from "@/components/providers";

function WillCard({ willId }: { willId: string }) {
  const { network } = useNetwork();
  const { data } = useSuiClientQuery(
    "getObject",
    { id: willId, options: { showContent: true } },
    { refetchInterval: 30000 }
  );

  const fields = data?.data?.content?.dataType === "moveObject"
    ? (data.data.content.fields as Record<string, unknown>)
    : null;

  const now = Date.now();
  const lastSeenMs = fields ? parseInt(fields.last_seen_ms as string) : 0;
  const timeoutMs = fields ? parseInt(fields.timeout_ms as string) : 0;
  const inGrace = fields ? fields.in_grace as boolean : false;
  const vault = fields ? parseInt(fields.vault as string ?? "0") : 0;
  const msUntilTrigger = Math.max(0, lastSeenMs + timeoutMs - now);
  const daysUntilTrigger = Math.floor(msUntilTrigger / 86400000);
  const status = inGrace ? "grace" : daysUntilTrigger < 7 ? "warning" : "active";

  return (
    <a
      href={`/will/${willId}`}
      className="block border border-border rounded-lg p-5 hover:border-primary transition-colors bg-background"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-muted-foreground">
          {willId.slice(0, 10)}...{willId.slice(-8)}
        </span>
        <Badge variant={status === "active" ? "default" : status === "grace" ? "destructive" : "secondary"}>
          {status.toUpperCase()}
        </Badge>
      </div>
      {fields ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">VAULT</p>
            <p className="font-mono text-sm text-foreground">{(vault / 1_000_000_000).toFixed(3)} SUI</p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">TIMEOUT</p>
            <p className="font-mono text-sm text-foreground">{timeoutMs / 86400000}d</p>
          </div>
          <div>
            <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">TRIGGER IN</p>
            <p className="font-mono text-sm text-foreground">{inGrace ? "GRACE" : `${daysUntilTrigger}d`}</p>
          </div>
        </div>
      ) : (
        <p className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</p>
      )}
    </a>
  );
}

export default function WillActivePage() {
  const account = useCurrentAccount();
  const { network } = useNetwork();
  const { willIds, isLoading } = useWillId();

  if (!account) {
    return (
      <DashboardPageLayout
        header={{ title: "My Wills", description: "Connect wallet", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">CONNECT WALLET</h2>
          <div className="w-48"><WalletButton /></div>
        </div>
      </DashboardPageLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardPageLayout
        header={{ title: "My Wills", description: "Loading...", icon: ProcessorIcon }}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">QUERYING CHAIN...</p>
        </div>
      </DashboardPageLayout>
    );
  }

  if (!willIds || willIds.length === 0) {
    return (
      <DashboardPageLayout
        header={{ title: "My Wills", description: "No wills found", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
          <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">NO WILL FOUND</h2>
          <p className="text-muted-foreground text-sm max-w-sm">You have not deployed a SuiWill contract yet.</p>
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
      header={{
        title: "My Wills",
        description: `${willIds.length} will${willIds.length > 1 ? "s" : ""} on Sui ${network.charAt(0).toUpperCase() + network.slice(1)}`,
        icon: ProcessorIcon,
      }}
    >
      <div className="flex flex-col gap-4">
        {[...willIds].reverse().map((id) => (
          <WillCard key={id} willId={id} />
        ))}
        <a
          href="/create"
          className="w-full text-center border border-border py-3 font-mono text-xs tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-md"
        >
          + CREATE NEW WILL
        </a>
      </div>
    </DashboardPageLayout>
  );
}

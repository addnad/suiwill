"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import DashboardPageLayout from "@/components/dashboard/layout";
import CuteRobotIcon from "@/components/icons/cute-robot";
import { Badge } from "@/components/ui/badge";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUIWILL_PACKAGE_ID!;

function msToCountdown(ms: number) {
  if (ms <= 0) return "00d 00h 00m";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

export default function WatcherPage() {
  const account = useCurrentAccount();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: eventsData, isLoading } = useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventType: `${PACKAGE_ID}::will::WillCreated` },
      limit: 50,
    },
    { enabled: !!PACKAGE_ID }
  );

  const willIds = eventsData?.data?.map(
    (e) => (e.parsedJson as { will_id: string })?.will_id
  ).filter(Boolean) ?? [];

  return (
    <DashboardPageLayout
      header={{
        title: "Watcher Agent",
        description: "VIGIL — monitoring all SuiWill contracts",
        icon: CuteRobotIcon,
      }}
    >
      <div className="flex flex-col gap-6">

        {/* Agent status */}
        <div className="border border-border bg-accent rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary mb-1">VIGIL WATCHER AGENT</p>
            <p className="font-display text-3xl tracking-widest text-foreground uppercase">MONITORING</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Checks all wills every 60 seconds · Calls trigger_grace() on inactivity
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
              <span className="font-mono text-[10px] text-success tracking-widest">ONLINE</span>
            </div>
            <Badge variant="secondary">Sui Testnet</Badge>
          </div>
        </div>

        {/* Agent specs */}
        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">AGENT CONFIGURATION</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "CHECK INTERVAL", value: "60s" },
              { label: "GRACE PERIOD", value: "7 days" },
              { label: "NETWORK", value: "Testnet" },
              { label: "RUNTIME", value: "Node.js" },
            ].map((s) => (
              <div key={s.label} className="border border-border rounded-lg p-4">
                <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className="font-display text-xl text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All monitored wills */}
        <div className="border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] tracking-widest text-primary">MONITORED WILLS</p>
            <Badge variant="secondary">{willIds.length} TOTAL</Badge>
          </div>

          {isLoading ? (
            <p className="font-mono text-xs text-muted-foreground animate-pulse">QUERYING CHAIN...</p>
          ) : willIds.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No wills found on testnet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {willIds.map((id) => (
                <WillRow key={id} willId={id} now={now} account={account?.address ?? ""} />
              ))}
            </div>
          )}
        </div>

        {/* How to run */}
        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">RUN THE WATCHER LOCALLY</p>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs text-muted-foreground leading-relaxed">
            <p className="text-success mb-1"># Install and run the VIGIL watcher agent</p>
            <p>cd watcher</p>
            <p>pnpm install</p>
            <p>node index.js</p>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-3">
            Uses your Sui CLI keypair at ~/.sui/sui_config/sui.keystore
          </p>
        </div>

      </div>
    </DashboardPageLayout>
  );
}

function WillRow({ willId, now, account }: { willId: string; now: number; account: string }) {
  const { data } = useSuiClientQuery(
    "getObject",
    { id: willId, options: { showContent: true } },
    { refetchInterval: 30000 }
  );

  const fields = data?.data?.content?.dataType === "moveObject"
    ? (data.data.content.fields as Record<string, unknown>)
    : null;

  if (!fields) return null;

  const lastSeenMs = parseInt(fields.last_seen_ms as string);
  const timeoutMs = parseInt(fields.timeout_ms as string);
  const inGrace = fields.in_grace as boolean;
  const owner = fields.owner as string;
  const msUntilTrigger = Math.max(0, lastSeenMs + timeoutMs - now);
  const isMyWill = owner === account;
  const status = inGrace ? "grace" : msUntilTrigger < 7 * 86400000 ? "warning" : "active";

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      "border-border"
    }`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-foreground">
            {willId.slice(0, 10)}...{willId.slice(-6)}
          </span>
          {isMyWill && (
            <Badge variant="default" className="text-[9px]">YOUR WILL</Badge>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          owner: {owner.slice(0, 8)}...{owner.slice(-4)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-foreground">
          {inGrace ? "GRACE" : msToCountdown(msUntilTrigger)}
        </span>
        <Badge variant={
          "secondary"
        }>
          {status === "grace" ? "GRACE" : status === "warning" ? "WARNING" : "ACTIVE"}
        </Badge>
      </div>
    </div>
  );
}

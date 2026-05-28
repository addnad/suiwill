"use client";

import { useParams } from "next/navigation";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUIWILL_PACKAGE_ID!;
const CLOCK_ID = process.env.NEXT_PUBLIC_SUI_CLOCK_ID!;

function msToCountdown(ms: number) {
  if (ms <= 0) return "00d 00h 00m";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

export default function WillPage() {
  const { id } = useParams<{ id: string }>();
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [txMsg, setTxMsg] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, refetch } = useSuiClientQuery(
    "getObject",
    {
      id,
      options: { showContent: true, showType: true },
    },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <DashboardPageLayout
        header={{ title: "My Will", description: "Loading...", icon: ProcessorIcon }}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">QUERYING CHAIN...</p>
        </div>
      </DashboardPageLayout>
    );
  }

  const obj = data?.data;
  if (!obj || !obj.content || obj.content.dataType !== "moveObject") {
    return (
      <DashboardPageLayout
        header={{ title: "My Will", description: "Not found", icon: ProcessorIcon }}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-xs tracking-widest text-muted-foreground">WILL NOT FOUND</p>
        </div>
      </DashboardPageLayout>
    );
  }

  const fields = obj.content.fields as Record<string, unknown>;
  const now = Date.now();
  const lastSeenMs = parseInt(fields.last_seen_ms as string);
  const timeoutMs = parseInt(fields.timeout_ms as string);
  const inGrace = fields.in_grace as boolean;
  const graceStartMs = parseInt(fields.grace_start_ms as string);
  const owner = fields.owner as string;
  const walrusBlobId = fields.walrus_blob_id as string;

  const msUntilTrigger = Math.max(0, lastSeenMs + timeoutMs - now);
  const daysAgo = Math.floor((now - lastSeenMs) / 86400000);
  const graceEndsMs = inGrace ? graceStartMs + 604800000 : null;
  const msUntilExecution = graceEndsMs ? Math.max(0, graceEndsMs - now) : null;

  const status = inGrace ? "grace" : msUntilTrigger < 7 * 86400000 ? "warning" : "active";

  const beneficiaryMap = fields.beneficiaries as {
    fields: { contents: { fields: { key: string; value: string } }[] };
  };
  const beneficiaries = beneficiaryMap?.fields?.contents?.map((e) => ({
    address: e.fields.key,
    share: parseInt(e.fields.value),
  })) ?? [];

  const isOwner = account?.address === owner;

  async function handleHeartbeat() {
    setError(""); setTxMsg("");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::will::heartbeat`,
      arguments: [tx.object(id), tx.object(CLOCK_ID)],
    });
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => { setTxMsg(`Heartbeat recorded: ${r.digest.slice(0, 20)}...`); refetch(); },
      onError: (e) => setError(e.message),
    });
  }

  async function handleCancelGrace() {
    setError(""); setTxMsg("");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::will::cancel_grace`,
      arguments: [tx.object(id), tx.object(CLOCK_ID)],
    });
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => { setTxMsg(`Grace cancelled: ${r.digest.slice(0, 20)}...`); refetch(); },
      onError: (e) => setError(e.message),
    });
  }

  return (
    <DashboardPageLayout
      header={{
        title: "My Will",
        description: `${id.slice(0, 6)}...${id.slice(-4)} · Sui Testnet`,
        icon: ProcessorIcon,
      }}
    >
      <div className="max-w-2xl flex flex-col gap-6">

        <div className={`border rounded-lg p-6 flex items-center justify-between ${
          status === "grace" ? "border-destructive bg-destructive/5" :
          status === "warning" ? "border-warning bg-warning/5" :
          "border-success bg-success/5"
        }`}>
          <div>
            <p className="font-mono text-[10px] tracking-widest opacity-60 mb-1">WILL STATUS</p>
            <p className={`font-display text-4xl tracking-widest uppercase ${
              status === "grace" ? "text-destructive" :
              status === "warning" ? "text-warning" :
              "text-success"
            }`}>
              {status === "grace" ? "GRACE PERIOD" : status === "warning" ? "WARNING" : "ACTIVE"}
            </p>
          </div>
          <Badge variant={status === "grace" ? "destructive" : status === "warning" ? "outline-warning" : "outline-success"}>
            {status === "grace" ? "ACTION NEEDED" : status === "warning" ? "LOW TIME" : "HEALTHY"}
          </Badge>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-2">
            {status === "grace" ? "TIME UNTIL EXECUTION" : "TIME UNTIL TRIGGER"}
          </p>
          <p className="font-display text-5xl md:text-6xl tracking-widest">
            {status === "grace" && msUntilExecution !== null
              ? msToCountdown(msUntilExecution)
              : msToCountdown(msUntilTrigger)}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-2">
            Last heartbeat: {daysAgo === 0 ? "today" : `${daysAgo} days ago`}
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-[10px] tracking-widest text-primary mb-4">BENEFICIARIES</p>
          <div className="flex flex-col gap-2">
            {beneficiaries.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {b.address.slice(0, 8)}...{b.address.slice(-6)}
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {(b.share / 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="font-mono text-[10px] tracking-widest text-primary mb-4">CONTRACT DETAILS</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "OBJECT ID", value: `${id.slice(0, 10)}...${id.slice(-8)}` },
              { label: "TIMEOUT", value: `${timeoutMs / 86400000} days` },
              { label: "GRACE PERIOD", value: "7 days (fixed)" },
              { label: "WALRUS MESSAGE", value: walrusBlobId ? "STORED" : "NONE" },
              { label: "NETWORK", value: "Sui Testnet" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-1 border-b border-border last:border-b-0">
                <span className="font-mono text-[10px] text-muted-foreground">{item.label}</span>
                <span className="font-mono text-[10px] text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="border border-border rounded-lg p-6">
            <p className="font-mono text-[10px] tracking-widest text-primary mb-4">ACTIONS</p>
            <div className="flex flex-col gap-3">
              {!inGrace && (
                <button
                  onClick={handleHeartbeat}
                  disabled={isPending}
                  className="w-full font-mono text-xs tracking-widest bg-primary text-primary-foreground py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-md"
                >
                  {isPending ? "SIGNING..." : "RECORD HEARTBEAT"}
                </button>
              )}
              {inGrace && (
                <button
                  onClick={handleCancelGrace}
                  disabled={isPending}
                  className="w-full font-mono text-xs tracking-widest bg-success text-primary-foreground py-3 hover:bg-success/90 transition-colors disabled:opacity-50 rounded-md"
                >
                  {isPending ? "SIGNING..." : "CANCEL GRACE PERIOD"}
                </button>
              )}
              <a
                href={`https://suiscan.xyz/testnet/object/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center font-mono text-xs tracking-widest border border-border py-3 hover:border-primary hover:text-primary transition-colors rounded-md"
              >
                VIEW ON SUI EXPLORER
              </a>
            </div>
            {txMsg && <p className="font-mono text-[10px] text-success mt-3">{txMsg}</p>}
            {error && <p className="font-mono text-[10px] text-destructive mt-3">{error}</p>}
          </div>
        )}

      </div>
    </DashboardPageLayout>
  );
}

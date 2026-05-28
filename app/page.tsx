"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useWill } from "@/hooks/use-will";
import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import RebelsRanking from "@/components/dashboard/rebels-ranking";
import BracketsIcon from "@/components/icons/brackets";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import { WalletButton } from "@/components/wallet-button";

const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
};

function LandingPage() {
  const { data } = useSuiClientQuery("getObject", {
    id: DEMO_WILL_ID,
    options: { showContent: true },
  });

  const fields = data?.data?.content?.dataType === "moveObject"
    ? (data.data.content.fields as Record<string, unknown>)
    : null;

  const now = Date.now();
  const lastSeenMs = fields ? parseInt(fields.last_seen_ms as string) : 0;
  const timeoutMs = fields ? parseInt(fields.timeout_ms as string) : 0;
  const msUntilTrigger = Math.max(0, lastSeenMs + timeoutMs - now);
  const beneficiaries = fields
    ? (fields.beneficiaries as { fields: { contents: unknown[] } })?.fields?.contents?.length ?? 0
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">

      {/* LEFT — Brand */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-16 lg:py-0">
        <div className="max-w-lg">
          <p className="font-mono text-[11px] tracking-[0.2em] text-primary mb-4 uppercase">
            — Sui Overflow 2026 · Agentic Web + Walrus
          </p>
          <h1 className="font-display text-[clamp(4rem,10vw,8rem)] leading-[0.88] tracking-tight text-foreground uppercase mb-6">
            SUI<br />WILL
          </h1>
          <p className="font-sans text-base text-muted-foreground leading-relaxed mb-8 max-w-sm">
            The trustless digital estate vault on Sui. If you stop signing, your will executes automatically. No lawyers. No custody. No trust required.
          </p>

          <div className="flex flex-col gap-3 mb-10">
            {[
              "Configure beneficiaries + percentage splits",
              "Final message stored permanently on Walrus",
              "VIGIL AI agent monitors your wallet 24/7",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-primary font-mono text-xs mt-0.5">0{i + 1}</span>
                <span className="font-mono text-xs text-muted-foreground tracking-wide">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-48">
              <WalletButton />
            </div>
            <a
              href={`https://suiscan.xyz/testnet/object/${DEMO_WILL_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-border font-mono text-xs tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors rounded-md text-center"
            >
              VIEW CONTRACT ↗
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT — Live demo will widget */}
      <div className="lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-center px-8 py-12 gap-6 bg-card">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-1">LIVE DEMO WILL</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {DEMO_WILL_ID.slice(0, 10)}...{DEMO_WILL_ID.slice(-6)} · Sui Testnet
          </p>
        </div>

        {/* Countdown */}
        <div className="border border-border rounded-lg p-6 bg-background">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-2">TIME UNTIL TRIGGER</p>
          <p className="font-display text-4xl tracking-widest text-foreground">
            {fields ? msToCountdown(msUntilTrigger) : "——"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "STATUS", value: fields ? "ACTIVE" : "—", color: "text-success" },
            { label: "BENEFICIARIES", value: fields ? String(beneficiaries) : "—", color: "text-foreground" },
            { label: "WALRUS MESSAGE", value: fields && (fields.walrus_blob_id as string) ? "STORED" : "NONE", color: "text-primary" },
            { label: "WATCHER", value: "ONLINE", color: "text-success" },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-lg p-4 bg-background">
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-1">{s.label}</p>
              <p className={`font-display text-xl tracking-wide ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className="border border-border rounded-lg p-4 bg-background">
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground mb-3">BUILT WITH</p>
          <div className="flex flex-wrap gap-2">
            {["Sui Move", "Walrus", "dapp-kit", "Claude AI", "Next.js"].map((tech) => (
              <span key={tech} className="font-mono text-[10px] px-2 py-1 border border-border rounded text-muted-foreground">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function NoWalletState() {
  return (
    <DashboardPageLayout
      header={{ title: "Overview", description: "SuiWill Dashboard", icon: BracketsIcon }}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">CONNECT WALLET</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Connect your Sui wallet to view your will status, manage beneficiaries, and monitor your watcher agent.
        </p>
        <div className="w-48"><WalletButton /></div>
      </div>
    </DashboardPageLayout>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">QUERYING CHAIN...</p>
    </div>
  );
}

function NoWillState() {
  return (
    <DashboardPageLayout
      header={{ title: "Overview", description: "No will found", icon: BracketsIcon }}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">NO WILL FOUND</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          You have not deployed a SuiWill contract yet. Create your will to get started.
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

export default function DashboardOverview() {
  const account = useCurrentAccount();
  const { will, isLoading, daysUntilTrigger, lastSeenDaysAgo, graceDaysRemaining, status } = useWill();

  if (!account) return <NoWalletState />;

  if (isLoading) {
    return (
      <DashboardPageLayout
        header={{ title: "Overview", description: "Loading...", icon: BracketsIcon }}
      >
        <LoadingState />
      </DashboardPageLayout>
    );
  }

  if (!will) return <NoWillState />;

  const dashboardStats = [
    {
      label: "WILL STATUS",
      value: status === "grace" ? "GRACE" : status === "warning" ? "WARNING" : "ACTIVE",
      description: status === "grace"
        ? `${graceDaysRemaining} DAYS UNTIL EXECUTION`
        : status === "warning" ? "INACTIVITY WARNING" : "SUI TESTNET",
      intent: status === "active" ? "positive" : status === "warning" ? "neutral" : "negative",
      icon: "gear",
      direction: status === "active" ? "up" : "down",
      tag: status === "grace" ? "GRACE PERIOD" : undefined,
    },
    {
      label: "DAYS UNTIL TRIGGER",
      value: String(daysUntilTrigger ?? 0),
      description: `${Math.floor(will.timeout_ms / 86400000)} DAY TIMEOUT SET`,
      intent: (daysUntilTrigger ?? 0) > 30 ? "positive" : "negative",
      icon: "proccesor",
      direction: "up",
    },
    {
      label: "LAST HEARTBEAT",
      value: lastSeenDaysAgo === 0 ? "TODAY" : `${lastSeenDaysAgo}d AGO`,
      description: "LAST SIGNED TX ON SUI",
      intent: (lastSeenDaysAgo ?? 0) < 7 ? "positive" : "negative",
      icon: "boom",
      tag: (lastSeenDaysAgo ?? 0) < 7 ? "HEALTHY" : "STALE",
    },
  ];

  const beneficiaries = will.beneficiaries.map((b, i) => ({
    id: i + 1,
    name: `${b.address.slice(0, 8)}...${b.address.slice(-6)}`,
    handle: `BENEFICIARY ${String(i + 1).padStart(2, "0")}`,
    points: b.share / 100,
    featured: i === 0,
    subtitle: i === 0 ? "PRIMARY BENEFICIARY" : undefined,
  }));

  return (
    <DashboardPageLayout
      header={{
        title: "Overview",
        description: `${account.address.slice(0, 6)}...${account.address.slice(-4)} · Sui Testnet`,
        icon: BracketsIcon,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            description={stat.description}
            icon={iconMap[stat.icon as keyof typeof iconMap]}
            tag={stat.tag}
            intent={stat.intent as "positive" | "negative" | "neutral"}
            direction={stat.direction as "up" | "down"}
          />
        ))}
      </div>
      <div className="mb-6">
        <DashboardChart timeoutDays={Math.floor(will.timeout_ms / 86400000)} />
      </div>
      <div className="mb-6">
        <RebelsRanking rebels={beneficiaries} />
      </div>
    </DashboardPageLayout>
  );
}

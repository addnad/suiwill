"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useWill } from "@/hooks/use-will";
import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import RebelsRanking from "@/components/dashboard/rebels-ranking";
import SecurityStatus from "@/components/dashboard/security-status";
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

function NoWalletState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">
        CONNECT WALLET
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Connect your Sui wallet to view your will status, manage beneficiaries, and monitor your watcher agent.
      </p>
      <div className="w-48">
        <WalletButton />
      </div>
    </div>
  );
}

function NoWillState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">
        NO WILL FOUND
      </h2>
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
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">
        QUERYING CHAIN...
      </p>
    </div>
  );
}

export default function DashboardOverview() {
  const account = useCurrentAccount();
  const {
    will,
    isLoading,
    daysUntilTrigger,
    lastSeenDaysAgo,
    graceDaysRemaining,
    status,
  } = useWill();

  if (!account) {
    return (
      <DashboardPageLayout
        header={{ title: "Overview", description: "SuiWill Dashboard", icon: BracketsIcon }}
      >
        <NoWalletState />
      </DashboardPageLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardPageLayout
        header={{ title: "Overview", description: "Loading...", icon: BracketsIcon }}
      >
        <LoadingState />
      </DashboardPageLayout>
    );
  }

  if (!will) {
    return (
      <DashboardPageLayout
        header={{
          title: "Overview",
          description: `${account.address.slice(0, 6)}...${account.address.slice(-4)}`,
          icon: BracketsIcon,
        }}
      >
        <NoWillState />
      </DashboardPageLayout>
    );
  }

  // Build stats from onchain data
  const dashboardStats = [
    {
      label: "WILL STATUS",
      value: status === "grace" ? "GRACE" : status === "warning" ? "WARNING" : "ACTIVE",
      description: status === "grace"
        ? `${graceDaysRemaining} DAYS UNTIL EXECUTION`
        : status === "warning"
        ? "INACTIVITY WARNING"
        : "SUI TESTNET",
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

  // Build beneficiaries for ranking component
  const beneficiaries = will.beneficiaries.map((b, i) => ({
    id: i + 1,
    name: `${b.address.slice(0, 6)}...${b.address.slice(-4)}`,
    handle: `BENEFICIARY ${String(i + 1).padStart(2, "0")}`,
    streak: "",
    points: b.share / 100,
    avatar: "",
    featured: i === 0,
    subtitle: i === 0 ? "PRIMARY BENEFICIARY" : undefined,
  }));

  // Build security statuses
  const securityStatuses = [
    {
      title: "WATCHER AGENT",
      value: "ONLINE",
      status: "[MONITORING...]",
      variant: "success" as const,
    },
    {
      title: "WALRUS MESSAGE",
      value: will.walrus_blob_id ? "STORED" : "NONE",
      status: will.walrus_blob_id ? "[ENCRYPTED]" : "[NO MESSAGE]",
      variant: (will.walrus_blob_id ? "success" : "warning") as const,
    },
    {
      title: "GRACE PERIOD",
      value: will.in_grace ? "ACTIVE" : "STANDBY",
      status: will.in_grace ? "[TRIGGERED]" : "[NOT TRIGGERED]",
      variant: (will.in_grace ? "destructive" : "warning") as const,
    },
  ];

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
        <DashboardChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RebelsRanking rebels={beneficiaries} />
        <SecurityStatus statuses={securityStatuses} />
      </div>
    </DashboardPageLayout>
  );
}

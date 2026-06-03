"use client";

import { useNetwork } from "@/components/providers";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";


export type WillNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
  read: boolean;
  priority: "low" | "medium" | "high";
};

function getEventNotification(event: {
  id: { txDigest: string; eventSeq: string };
  type: string;
  parsedJson: unknown;
  timestampMs?: string;
  sender: string;
}, account: string, network: string): WillNotification | null {
  const parsed = event.parsedJson as Record<string, string>;
  const ts = event.timestampMs
    ? new Date(parseInt(event.timestampMs)).toISOString()
    : new Date().toISOString();
  const id = `${event.id.txDigest}-${event.id.eventSeq}`;

  if (event.type.includes("WillCreated") && event.sender === account) {
    return {
      id,
      title: "WILL DEPLOYED",
      message: `Your SuiWill contract is live on Sui ${network}. VIGIL watcher agent is now monitoring your wallet activity.`,
      timestamp: ts,
      type: "success",
      read: false,
      priority: "medium",
    };
  }

  if (event.type.includes("HeartbeatRecorded") && parsed?.owner === account) {
    return {
      id,
      title: "HEARTBEAT RECORDED",
      message: `Signed transaction detected on Sui. Your inactivity clock has been reset.`,
      timestamp: ts,
      type: "info",
      read: false,
      priority: "low",
    };
  }

  if (event.type.includes("GraceTriggered") && parsed?.owner === account) {
    return {
      id,
      title: "GRACE PERIOD TRIGGERED",
      message: `Inactivity detected. Your will enters a 7-day grace period. Sign any Sui transaction to cancel.`,
      timestamp: ts,
      type: "warning",
      read: false,
      priority: "high",
    };
  }

  if (event.type.includes("GraceCancelled") && parsed?.owner === account) {
    return {
      id,
      title: "GRACE PERIOD CANCELLED",
      message: `Grace period cancelled. Your will is active again. Keep signing transactions to stay safe.`,
      timestamp: ts,
      type: "success",
      read: false,
      priority: "medium",
    };
  }

  if (event.type.includes("WillExecuted") && parsed?.owner === account) {
    return {
      id,
      title: "WILL EXECUTED",
      message: `Your will has been executed. Assets have been distributed to your beneficiaries.`,
      timestamp: ts,
      type: "error",
      read: false,
      priority: "high",
    };
  }

  return null;
}

export function useWillNotifications() {
  const { packageId: PACKAGE_ID, network } = useNetwork();
  const account = useCurrentAccount();

  const eventTypes = [
    "WillCreated",
    "HeartbeatRecorded",
    "GraceTriggered",
    "GraceCancelled",
    "WillExecuted",
  ];

  const results = eventTypes.map((eventType) =>
    useSuiClientQuery(
      "queryEvents",
      {
        query: { MoveEventType: `${PACKAGE_ID}::will::${eventType}` },
        limit: 10,
      },
      { enabled: !!account?.address && !!PACKAGE_ID }
    )
  );

  const isLoading = results.some((r) => r.isLoading);
  const allEvents = results.flatMap((r) => r.data?.data ?? []);

  const notifications: WillNotification[] = allEvents
    .map((e) => getEventNotification(e as Parameters<typeof getEventNotification>[0], account?.address ?? "", network))
    .filter((n): n is WillNotification => n !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { notifications, isLoading };
}

"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { SuiObjectData } from "@mysten/sui/client";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUIWILL_PACKAGE_ID!;

export type WillData = {
  id: string;
  owner: string;
  last_seen_ms: number;
  timeout_ms: number;
  walrus_blob_id: string;
  in_grace: boolean;
  grace_start_ms: number;
  beneficiaries: { address: string; share: number }[];
};

function parseWillObject(obj: SuiObjectData): WillData | null {
  if (!obj.content || obj.content.dataType !== "moveObject") return null;
  const fields = obj.content.fields as Record<string, unknown>;

  // Parse beneficiaries from VecMap
  const beneficiaryMap = fields.beneficiaries as {
    fields: { contents: { fields: { key: string; value: string } }[] };
  };
  const beneficiaries =
    beneficiaryMap?.fields?.contents?.map((entry) => ({
      address: entry.fields.key,
      share: parseInt(entry.fields.value),
    })) ?? [];

  return {
    id: obj.objectId,
    owner: fields.owner as string,
    last_seen_ms: parseInt(fields.last_seen_ms as string),
    timeout_ms: parseInt(fields.timeout_ms as string),
    walrus_blob_id: fields.walrus_blob_id as string,
    in_grace: fields.in_grace as boolean,
    grace_start_ms: parseInt(fields.grace_start_ms as string),
    beneficiaries,
  };
}

export function useWill() {
  const account = useCurrentAccount();

  const { data, isLoading, error, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      filter: {
        StructType: `${PACKAGE_ID}::will::SuiWill`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!account?.address && !!PACKAGE_ID,
      refetchInterval: 10000,
    }
  );

  const willObject = data?.data?.[0];
  const will =
    willObject?.data ? parseWillObject(willObject.data) : null;

  // Compute derived values
  const now = Date.now();
  const msUntilTrigger = will
    ? Math.max(0, will.last_seen_ms + will.timeout_ms - now)
    : null;
  const daysUntilTrigger = msUntilTrigger !== null
    ? Math.floor(msUntilTrigger / 86400000)
    : null;
  const lastSeenDaysAgo = will
    ? Math.floor((now - will.last_seen_ms) / 86400000)
    : null;
  const graceEndsMs = will?.in_grace
    ? will.grace_start_ms + 604800000
    : null;
  const graceDaysRemaining = graceEndsMs
    ? Math.max(0, Math.floor((graceEndsMs - now) / 86400000))
    : null;

  const status = !will
    ? "none"
    : will.in_grace
    ? "grace"
    : daysUntilTrigger !== null && daysUntilTrigger < 7
    ? "warning"
    : "active";

  return {
    will,
    isLoading,
    error,
    refetch,
    daysUntilTrigger,
    lastSeenDaysAgo,
    graceDaysRemaining,
    status,
  };
}

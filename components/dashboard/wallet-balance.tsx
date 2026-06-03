"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

export function WalletBalance() {
  const account = useCurrentAccount();

  const { data } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "", coinType: "0x2::sui::SUI" },
    { enabled: !!account?.address }
  );

  if (!account || !data) return null;

  const sui = (parseInt(data.totalBalance) / 1_000_000_000).toFixed(3);

  return (
    <span className="font-mono text-xs text-muted-foreground">
      {sui} SUI
    </span>
  );
}

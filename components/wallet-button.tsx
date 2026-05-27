"use client";

import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useState } from "react";

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (account) {
    return (
      <div className="relative w-full">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-mono tracking-widest uppercase bg-sidebar-accent hover:bg-sidebar-accent-hover text-sidebar-foreground border border-sidebar-border transition-colors"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] opacity-50">CONNECTED</span>
            <span className="text-xs">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-sidebar border border-sidebar-border rounded-md overflow-hidden z-50">
            <button
              onClick={() => { disconnect(); setShowMenu(false); }}
              className="w-full px-3 py-2 text-xs font-mono tracking-widest uppercase text-left hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ConnectModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          onClick={() => setOpen(true)}
          className="w-full px-3 py-2 rounded-md text-xs font-mono tracking-widest uppercase bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground border border-sidebar-border transition-colors"
        >
          CONNECT WALLET
        </button>
      }
    />
  );
}

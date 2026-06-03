"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import BracketsIcon from "@/components/icons/brackets";
import MonkeyIcon from "@/components/icons/monkey";
import ProcessorIcon from "@/components/icons/proccesor";
import CuteRobotIcon from "@/components/icons/cute-robot";
import GearIcon from "@/components/icons/gear";
import { Bullet } from "@/components/ui/bullet";
import LockIcon from "@/components/icons/lock";
import { useIsV0 } from "@/lib/v0-context";
import { WalletButton } from "@/components/wallet-button";
import { useNetwork } from "@/components/providers";

const navItems = [
  { title: "Overview",      url: "/",            icon: BracketsIcon,  locked: false },
  { title: "My Will",       url: "/will/active", icon: ProcessorIcon, locked: false },
  { title: "Watcher Agent", url: "/watcher",     icon: CuteRobotIcon, locked: false },
  { title: "Settings",      url: "/settings",    icon: GearIcon,      locked: false },
];

function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Bullet className="mr-2" />
        Network
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="px-2 py-1 flex gap-2">
          <button
            onClick={() => setNetwork("testnet")}
            className={cn(
              "flex-1 text-xs py-1.5 rounded border font-mono uppercase tracking-widest transition-colors",
              network === "testnet"
                ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary"
                : "bg-transparent text-sidebar-foreground border-border opacity-50 hover:opacity-100"
            )}
          >
            Testnet
          </button>
          <button
            onClick={() => setNetwork("mainnet")}
            className={cn(
              "flex-1 text-xs py-1.5 rounded border font-mono uppercase tracking-widest transition-colors",
              network === "mainnet"
                ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary"
                : "bg-transparent text-sidebar-foreground border-border opacity-50 hover:opacity-100"
            )}
          >
            Mainnet
          </button>
        </div>

      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function WalletFooter() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Bullet className="mr-2" />
        Wallet
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="px-2 py-1">
          <WalletButton />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const isV0 = useIsV0();
  const pathname = usePathname();

  return (
    <Sidebar {...props} className={cn("py-sides", className)}>
      <SidebarHeader className="rounded-t-lg flex gap-3 flex-row rounded-b-none">
        <div className="flex overflow-clip size-12 shrink-0 items-center justify-center rounded bg-sidebar-primary-foreground/10 text-sidebar-primary-foreground">
          <MonkeyIcon className="size-8" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="text-2xl font-display tracking-widest">SUIWILL</span>
          <span className="text-xs uppercase opacity-60">Dead Man's Switch on Sui</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="rounded-t-none">
          <SidebarGroupLabel>
            <Bullet className="mr-2" />
            SUIWILL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={cn(
                    item.locked && "pointer-events-none opacity-50",
                    isV0 && "pointer-events-none"
                  )}
                  data-disabled={item.locked}
                >
                  <SidebarMenuButton
                    asChild={!item.locked}
                    isActive={pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url.replace("/active", "")))}
                    disabled={item.locked}
                    className={cn(
                      "disabled:cursor-not-allowed",
                      item.locked && "pointer-events-none"
                    )}
                  >
                    {item.locked ? (
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </div>
                    ) : (
                      <a href={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </a>
                    )}
                  </SidebarMenuButton>
                  {item.locked && (
                    <SidebarMenuBadge>
                      <LockIcon className="size-5 block" />
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <NetworkSwitcher />
        <WalletFooter />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

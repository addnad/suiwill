"use client";

import * as React from "react";
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
import ProcessorIcon from "@/components/icons/proccesor";
import CuteRobotIcon from "@/components/icons/cute-robot";
import GearIcon from "@/components/icons/gear";
import { Bullet } from "@/components/ui/bullet";
import LockIcon from "@/components/icons/lock";
import { useIsV0 } from "@/lib/v0-context";
import { WalletButton } from "@/components/wallet-button";

const data = {
  navMain: [
    {
      title: "SUIWILL",
      items: [
        {
          title: "Overview",
          url: "/",
          icon: BracketsIcon,
          isActive: true,
          locked: false,
        },
        {
          title: "My Will",
          url: "/will",
          icon: ProcessorIcon,
          isActive: false,
          locked: false,
        },
        {
          title: "Watcher Agent",
          url: "/watcher",
          icon: CuteRobotIcon,
          isActive: false,
          locked: false,
        },
        {
          title: "Settings",
          url: "/settings",
          icon: GearIcon,
          isActive: false,
          locked: false,
        },
      ],
    },
  ],
};

function VIGILIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="12.5" width="12" height="2.5" fill="currentColor" />
      <rect x="24" y="15" width="2" height="3" fill="currentColor" />
      <rect x="28" y="15" width="2" height="3" fill="currentColor" />
      <polyline
        points="2,14 6,14 7.5,9 9,19 10.5,9 12,19 13.5,14 30,14"
        stroke="#2196f3"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  return (
    <Sidebar {...props} className={cn("py-sides", className)}>
      <SidebarHeader className="rounded-t-lg flex gap-3 flex-row rounded-b-none">
        <div className="flex overflow-clip size-12 shrink-0 items-center justify-center rounded bg-sidebar-primary-foreground/10 text-sidebar-primary-foreground">
          <VIGILIcon className="size-8" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="text-2xl font-display tracking-widest">SUIWILL</span>
          <span className="text-xs uppercase opacity-60">Dead Man's Switch on Sui</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {data.navMain.map((group, i) => (
          <SidebarGroup
            className={cn(i === 0 && "rounded-t-none")}
            key={group.title}
          >
            <SidebarGroupLabel>
              <Bullet className="mr-2" />
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
                      isActive={item.isActive}
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
        ))}
      </SidebarContent>

      <SidebarFooter className="p-0">
        <WalletFooter />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

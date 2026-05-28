"use client";

import { Badge } from "@/components/ui/badge";
import DashboardCard from "@/components/dashboard/card";

interface Beneficiary {
  id: number;
  name: string;
  handle: string;
  points: number;
  featured?: boolean;
  subtitle?: string;
}

interface BeneficiariesProps {
  rebels: Beneficiary[];
}

export default function RebelsRanking({ rebels }: BeneficiariesProps) {
  return (
    <DashboardCard
      title="BENEFICIARIES"
      intent="default"
      addon={<Badge variant="outline-warning">{rebels.length} WALLET{rebels.length !== 1 ? "S" : ""}</Badge>}
    >
      <div className="space-y-3">
        {rebels.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center rounded text-xs font-bold px-2 py-1 font-mono ${
                b.featured
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {String(b.id).padStart(2, "0")}
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm text-foreground">{b.name}</span>
                {b.subtitle && (
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{b.subtitle}</span>
                )}
                {!b.subtitle && b.handle && (
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{b.handle}</span>
                )}
              </div>
            </div>
            <Badge variant={b.featured ? "default" : "secondary"} className="font-mono text-xs">
              {b.points}%
            </Badge>
          </div>
        ))}
        {rebels.length === 0 && (
          <p className="font-mono text-xs text-muted-foreground text-center py-4">
            NO BENEFICIARIES CONFIGURED
          </p>
        )}
      </div>
    </DashboardCard>
  );
}

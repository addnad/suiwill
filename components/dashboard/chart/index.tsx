"use client";

import * as React from "react";
import { XAxis, YAxis, CartesianGrid, Area, AreaChart, ReferenceLine } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bullet } from "@/components/ui/bullet";

const chartConfig = {
  activity: {
    label: "Heartbeat",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function generateHeartbeatData(days: number, timeoutDays: number) {
  const data = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const label = days <= 7
      ? date.toLocaleDateString("en-US", { weekday: "short" })
      : days <= 31
      ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : date.toLocaleDateString("en-US", { month: "short" });
    // Simulate heartbeat activity — 1 = signed tx, 0 = no activity
    const activity = Math.random() > 0.3 ? 1 : 0;
    data.push({ date: label, activity });
  }
  return data;
}

export default function DashboardChart({ timeoutDays = 180 }: { timeoutDays?: number }) {
  const [activeTab, setActiveTab] = React.useState("week");

  const weekData = React.useMemo(() => generateHeartbeatData(7, timeoutDays), [timeoutDays]);
  const monthData = React.useMemo(() => generateHeartbeatData(30, timeoutDays), [timeoutDays]);
  const yearData = React.useMemo(() => generateHeartbeatData(180, timeoutDays), [timeoutDays]);

  const renderChart = (data: { date: string; activity: number }[]) => (
    <div className="bg-accent rounded-lg p-3">
      <ChartContainer className="md:aspect-[3/1] w-full" config={chartConfig}>
        <AreaChart data={data} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
          <defs>
            <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-activity)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-activity)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            horizontal={false}
            strokeDasharray="8 8"
            strokeWidth={2}
            stroke="var(--muted-foreground)"
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={12}
            strokeWidth={1.5}
            className="uppercase text-sm fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            tickCount={2}
            className="text-sm fill-muted-foreground"
            tickFormatter={(v) => v === 1 ? "SIGNED" : ""}
            domain={[0, 1]}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                className="min-w-[160px] px-4 py-3"
                formatter={(value) => value === 1 ? "TX SIGNED" : "NO ACTIVITY"}
              />
            }
          />
          <Area
            dataKey="activity"
            type="step"
            fill="url(#fillActivity)"
            fillOpacity={0.4}
            stroke="var(--color-activity)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="max-md:gap-4">
      <div className="flex items-center justify-between mb-4 max-md:contents">
        <TabsList className="max-md:w-full">
          <TabsTrigger value="week">7 DAYS</TabsTrigger>
          <TabsTrigger value="month">30 DAYS</TabsTrigger>
          <TabsTrigger value="year">180 DAYS</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-6 max-md:order-1">
          <div className="flex items-center gap-2 uppercase">
            <Bullet style={{ backgroundColor: "var(--chart-1)" }} className="rotate-45" />
            <span className="text-sm font-medium text-muted-foreground">HEARTBEAT ACTIVITY</span>
          </div>
        </div>
      </div>
      <TabsContent value="week">{renderChart(weekData)}</TabsContent>
      <TabsContent value="month">{renderChart(monthData)}</TabsContent>
      <TabsContent value="year">{renderChart(yearData)}</TabsContent>
    </Tabs>
  );
}

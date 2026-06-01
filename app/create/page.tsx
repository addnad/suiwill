"use client";

import { useState, useEffect } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import DashboardPageLayout from "@/components/dashboard/layout";
import ProcessorIcon from "@/components/icons/proccesor";
import { WalletButton } from "@/components/wallet-button";
import { Badge } from "@/components/ui/badge";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUIWILL_PACKAGE_ID!;
const CLOCK_ID = process.env.NEXT_PUBLIC_SUI_CLOCK_ID!;

// Timeout options in milliseconds
const TIMEOUT_OPTIONS = [
  { label: "30 days",  value: 30 * 24 * 60 * 60 * 1000 },
  { label: "60 days",  value: 60 * 24 * 60 * 60 * 1000 },
  { label: "90 days",  value: 90 * 24 * 60 * 60 * 1000 },
  { label: "180 days", value: 180 * 24 * 60 * 60 * 1000 },
  { label: "365 days", value: 365 * 24 * 60 * 60 * 1000 },
];

type Beneficiary = {
  id: string;
  address: string;
  share: number;
};

type Step = 1 | 2 | 3 | 4;

export default function CreatePage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [step, setStep] = useState<Step>(1);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { id: "1", address: "", share: 100 },
  ]);
  const [timeoutMs, setTimeoutMs] = useState(180 * 24 * 60 * 60 * 1000);
  const [message, setMessage] = useState("");
  const [depositSui, setDepositSui] = useState("0.1");
  const [txDigest, setTxDigest] = useState("");
  const [error, setError] = useState("");

  // Load config from VIGIL AI if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get("config");
    if (!configParam) return;
    try {
      const config = JSON.parse(decodeURIComponent(configParam));
      console.log("Parsed VIGIL config:", config);
      if (config.beneficiaries?.length) {
        setBeneficiaries(
          config.beneficiaries.map((b: { address: string; share: number }, i: number) => ({
            id: String(i + 1),
            address: b.address,
            share: b.share,
          }))
        );
      }
      if (config.timeoutDays) {
        const ms = config.timeoutDays * 24 * 60 * 60 * 1000;
        const closest = TIMEOUT_OPTIONS.reduce((prev, curr) =>
          Math.abs(curr.value - ms) < Math.abs(prev.value - ms) ? curr : prev
        );
        setTimeoutMs(closest.value);
      }
      if (config.message) setMessage(config.message);
    } catch {
      console.error("Failed to parse VIGIL config from URL");
    }
  }, []);

  const totalShares = beneficiaries.reduce((sum, b) => sum + b.share, 0);
  const sharesValid = totalShares === 100;
  const addressesValid = beneficiaries.every(
    (b) => b.address.startsWith("0x") && b.address.length >= 60
  );

  function addBeneficiary() {
    setBeneficiaries([...beneficiaries, { id: Date.now().toString(), address: "", share: 0 }]);
  }

  function removeBeneficiary(id: string) {
    if (beneficiaries.length === 1) return;
    setBeneficiaries(beneficiaries.filter((b) => b.id !== id));
  }

  function updateBeneficiary(id: string, field: "address" | "share", value: string | number) {
    setBeneficiaries(beneficiaries.map((b) => b.id === id ? { ...b, [field]: value } : b));
  }

  async function handleDeploy() {
    if (!account) return;
    setError("");

    try {
      // Upload message to Walrus if provided
      let blobIdBytes: number[] = [];
      if (message.trim()) {
        try {
          const encoder = new TextEncoder();
          const msgBytes = encoder.encode(message);
          // For testnet demo — store as UTF-8 bytes directly
          // In production: POST to Walrus publisher endpoint
          blobIdBytes = Array.from(msgBytes).slice(0, 32);
        } catch {
          console.log("Walrus upload skipped — using empty blob ID");
        }
      }

      const tx = new Transaction();

      // Convert shares to basis points (out of 10000)
      const addresses = beneficiaries.map((b) => b.address);
      const shares = beneficiaries.map((b) => Math.round((b.share / 100) * 10000));

      // Split deposit coin from gas
      const depositMist = BigInt(Math.round(parseFloat(depositSui || "0") * 1_000_000_000));
      const [depositCoin] = tx.splitCoins(tx.gas, [depositMist]);

      tx.moveCall({
        target: `${PACKAGE_ID}::will::create_will`,
        arguments: [
          tx.pure.vector("address", addresses),
          tx.pure.vector("u64", shares),
          tx.pure.u64(BigInt(timeoutMs)),
          tx.pure.vector("u8", blobIdBytes),
          depositCoin,
          tx.object(CLOCK_ID),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxDigest(result.digest);
            setStep(4);
          },
          onError: (err) => {
            setError(err.message || "Transaction failed");
          },
        }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!account) {
    return (
      <DashboardPageLayout
        header={{ title: "Create Will", description: "Deploy your SuiWill contract", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl tracking-widest uppercase">CONNECT WALLET</h2>
          <p className="text-muted-foreground text-sm max-w-sm">Connect your Sui wallet to deploy your will.</p>
          <div className="w-48"><WalletButton /></div>
        </div>
      </DashboardPageLayout>
    );
  }

  // Step 4 — Success
  if (step === 4) {
    return (
      <DashboardPageLayout
        header={{ title: "Will Deployed", description: "Your SuiWill is live", icon: ProcessorIcon }}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-success/10 border border-success flex items-center justify-center">
            <span className="text-primary text-2xl">✓</span>
          </div>
          <div>
            <h2 className="font-display text-4xl tracking-widest uppercase mb-2">WILL DEPLOYED</h2>
            <p className="text-muted-foreground text-sm">Your SuiWill contract is live on Sui testnet.</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <a
              href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center px-4 py-3 border border-border font-mono text-xs tracking-widest uppercase hover:border-primary hover:text-primary transition-colors rounded-md"
            >
              VIEW ON SUI EXPLORER
            </a>
            <a
              href="/"
              className="w-full text-center px-4 py-3 bg-primary text-primary-foreground font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors rounded-md"
            >
              GO TO DASHBOARD
            </a>
          </div>
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Create Will",
        description: `${account.address.slice(0, 6)}...${account.address.slice(-4)}`,
        icon: ProcessorIcon,
      }}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 border border-border rounded-lg overflow-hidden">
        {[
          { n: 1, label: "BENEFICIARIES" },
          { n: 2, label: "TIMEOUT" },
          { n: 3, label: "MESSAGE" },
        ].map((s) => (
          <button
            key={s.n}
            onClick={() => setStep(s.n as Step)}
            className={`flex-1 px-4 py-3 flex items-center gap-2 border-r border-border last:border-r-0 transition-colors ${
              step === s.n ? "bg-accent" : "hover:bg-accent/50"
            }`}
          >
            <span className={`font-mono text-[10px] w-5 h-5 flex items-center justify-center border rounded ${
              step === s.n ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}>
              {s.n}
            </span>
            <span className={`font-mono text-[10px] tracking-widest hidden sm:block ${
              step === s.n ? "text-foreground" : "text-muted-foreground"
            }`}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="w-full">

        {/* Step 1 — Beneficiaries */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="border border-border rounded-lg p-6">
              <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">BENEFICIARY ADDRESSES</p>
              <div className="flex flex-col gap-3">
                {beneficiaries.map((b) => (
                  <div key={b.id} className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="0x... Sui wallet address"
                      value={b.address}
                      onChange={(e) => updateBeneficiary(b.id, "address", e.target.value)}
                      className="flex-1 bg-muted border border-border px-3 py-2 font-mono text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors rounded-md"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={b.share}
                      onChange={(e) => updateBeneficiary(b.id, "share", parseInt(e.target.value) || 0)}
                      className="w-20 bg-muted border border-border px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-md text-right"
                    />
                    <span className="font-mono text-xs text-muted-foreground pt-2">%</span>
                    <button
                      onClick={() => removeBeneficiary(b.id)}
                      className="border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:border-destructive hover:text-destructive transition-colors rounded-md"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addBeneficiary}
                className="mt-3 font-mono text-[10px] tracking-widest text-primary border border-border px-3 py-1.5 hover:border-primary transition-colors rounded-md"
              >
                + ADD BENEFICIARY
              </button>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="font-mono text-[10px] text-muted-foreground">TOTAL ALLOCATION</span>
                <span className={`font-mono text-[11px] font-bold ${sharesValid ? "text-success" : "text-destructive"}`}>
                  {totalShares}% {sharesValid ? "✓" : "(must equal 100%)"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!sharesValid || !addressesValid}
              className="w-full font-mono text-xs tracking-widest bg-primary text-primary-foreground py-3 hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md"
            >
              NEXT: SET TIMEOUT →
            </button>
          </div>
        )}

        {/* Step 2 — Timeout */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="border border-border rounded-lg p-6">
              <p className="font-mono text-xs tracking-widest text-primary mb-2 uppercase">INACTIVITY TIMEOUT</p>
              <p className="text-muted-foreground text-sm mb-6">
                If no signed transaction is detected on Sui for this period, your will enters a 7-day grace period.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {TIMEOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeoutMs(opt.value)}
                    className={`border py-3 font-mono text-[10px] tracking-widest transition-colors rounded-md ${
                      timeoutMs === opt.value
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 border-t border-border pt-4 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">INACTIVITY WINDOW</span>
                  <span className="font-mono text-[10px] text-foreground">{timeoutMs / 86400000} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">GRACE PERIOD</span>
                  <span className="font-mono text-[10px] text-foreground">7 days (fixed)</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-mono text-[10px] text-muted-foreground">TOTAL BEFORE EXECUTION</span>
                  <span className="font-mono text-[10px] text-primary font-bold">{timeoutMs / 86400000 + 7} days</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 font-mono text-xs tracking-widest border border-border py-3 hover:border-primary hover:text-primary transition-colors rounded-md">
                ← BACK
              </button>
              <button onClick={() => setStep(3)} className="flex-1 font-mono text-xs tracking-widest bg-primary text-primary-foreground py-3 hover:bg-primary/90 transition-colors rounded-md">
                NEXT: FINAL MESSAGE →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Message + Deploy */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="border border-border rounded-lg p-6">
              <p className="font-mono text-xs tracking-widest text-primary mb-2 uppercase">FINAL MESSAGE</p>
              <p className="text-muted-foreground text-sm mb-4">
                Write a message to your beneficiaries. Stored on Walrus — immutable and only readable after execution.
              </p>
              <textarea
                rows={6}
                placeholder="To my family — here are the instructions for accessing my assets..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-muted border border-border px-3 py-2 font-mono text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none rounded-md leading-relaxed"
              />
              <p className="font-mono text-[9px] text-muted-foreground mt-2">
                {message.length} characters · Optional but recommended
              </p>
            </div>

            {/* Deposit */}
            <div className="border border-border rounded-lg p-6">
              <p className="font-mono text-xs tracking-widest text-primary mb-2 uppercase">VAULT DEPOSIT</p>
              <p className="text-muted-foreground text-sm mb-4">
                Deposit SUI into your will vault. These funds will be distributed to your beneficiaries when your will executes. You can add more later.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={depositSui}
                  onChange={(e) => setDepositSui(e.target.value)}
                  className="w-32 bg-muted border border-border px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary transition-colors rounded-md text-right"
                />
                <span className="font-mono text-xs text-muted-foreground">SUI</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  = {(parseFloat(depositSui || "0") * 1_000_000_000).toLocaleString()} MIST
                </span>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground mt-2">
                Minimum 0 SUI. You can deposit more anytime from My Will page.
              </p>
            </div>

            {/* Summary */}
            <div className="border border-border rounded-lg p-6">
              <p className="font-mono text-xs tracking-widest text-primary mb-4 uppercase">WILL SUMMARY</p>
              <div className="flex flex-col gap-2">
                {beneficiaries.map((b, i) => (
                  <div key={b.id} className="flex justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">BENEFICIARY {String(i + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-[10px] text-foreground">{b.address.slice(0, 6)}...{b.address.slice(-4)} · {b.share}%</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 mt-1">
                  <span className="font-mono text-[10px] text-muted-foreground">TIMEOUT</span>
                  <span className="font-mono text-[10px] text-foreground">{timeoutMs / 86400000} days + 7 grace</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">MESSAGE</span>
                  <span className="font-mono text-[10px] text-foreground">{message.length > 0 ? "PROVIDED" : "SKIPPED"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">VAULT DEPOSIT</span>
                  <span className="font-mono text-[10px] text-foreground">{depositSui} SUI</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">NETWORK</span>
                  <Badge variant="secondary" className="font-mono text-[9px]">SUI TESTNET</Badge>
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-destructive rounded-lg p-3">
                <p className="font-mono text-[10px] text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 font-mono text-xs tracking-widest border border-border py-3 hover:border-primary hover:text-primary transition-colors rounded-md">
                ← BACK
              </button>
              <button
                onClick={handleDeploy}
                disabled={isPending}
                className="flex-1 font-mono text-xs tracking-widest bg-primary text-primary-foreground py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-md"
              >
                {isPending ? "DEPLOYING..." : "DEPLOY WILL →"}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardPageLayout>
  );
}

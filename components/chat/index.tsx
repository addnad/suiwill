"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { motion } from "motion/react";
import { useChatState } from "./use-chat-state";
import { ChatHeader } from "./chat-header";

const PANEL_HEIGHT = 500;
const HEADER_HEIGHT = 56;
const INPUT_HEIGHT = 60;
const MESSAGES_HEIGHT = PANEL_HEIGHT - INPUT_HEIGHT;

type Message = {
  id: string;
  role: "user" | "vigil";
  content: string;
  willConfig?: {
    beneficiaries: { address: string; share: number }[];
    timeoutDays: number;
    message?: string;
    warnings?: string[];
  };
};

function sanitize(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, "");
}

function VIGILChat() {
  const account = useCurrentAccount();
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "vigil", content: "Connect your Sui wallet to get started." },
  ]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Update welcome message when wallet connects
  useEffect(() => {
    if (account) {
      setMessages([{
        id: "welcome",
        role: "vigil",
        content: `Wallet connected: ${account.address.slice(0, 8)}...${account.address.slice(-4)}. Describe your will in plain English. Example: leave 60% to 0x4f3a... and 40% to 0x9d1b... trigger after 6 months`,
      }]);
    }
  }, [account?.address]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSend() {
    const raw = inputRef.current?.value ?? "";
    if (!raw.trim() || loading) return;
    const cleanInput = raw.trim().replace(/[\u2013\u2014]/g, "-").replace(/[^\x00-\x7F]/g, "");
    if (inputRef.current) { inputRef.current.value = ""; inputRef.current.style.height = "auto"; }

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: cleanInput }]);
    setLoading(true);

    try {
      const res = await fetch("/api/vigil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: cleanInput,
          context: account ? { address: account.address, network: "testnet" } : null,
        }),
      });
      const data = await res.json();

      if (data.success && data.type === "chat") {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "vigil",
          content: sanitize(data.response || "I am here to help."),
        }]);
      } else if (data.success && data.type === "will" && data.will) {
        const will = data.will;
        will.beneficiaries = will.beneficiaries.map((b: { address: string; share: number }) => ({
          ...b, address: sanitize(b.address),
        }));
        if (will.message) will.message = sanitize(will.message);
        if (will.warnings) will.warnings = will.warnings.map(sanitize);
        const summary = [
          "WILL CONFIGURED:",
          ...will.beneficiaries.map((b: { address: string; share: number }) =>
            `- ${b.address.slice(0, 8)}...${b.address.slice(-4)} : ${b.share}%`),
          `- Timeout: ${will.timeoutDays} days`,
          will.message ? `- Message: ${will.message.slice(0, 40)}...` : null,
          ...(will.warnings?.length ? [`! ${will.warnings.join(", ")}`] : []),
        ].filter(Boolean).join("\n");
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "vigil",
          content: summary,
          willConfig: will,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "vigil",
          content: data.error || "Something went wrong.",
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: "vigil",
        content: "Network error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleApply(willConfig: Message["willConfig"]) {
    if (!willConfig) return;
    window.location.href = `/create?config=${encodeURIComponent(JSON.stringify(willConfig))}`;
  }

  return (
    <div style={{ height: `${PANEL_HEIGHT}px`, display: "flex", flexDirection: "column", background: "var(--background)", borderTop: "1px solid var(--border)", overflow: "hidden" }}>

      {/* Messages — fixed height, scrollable */}
      <div
        ref={messagesRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minHeight: 0,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: msg.role === "user" ? "var(--primary)" : "var(--accent)",
              color: msg.role === "user" ? "var(--primary-foreground)" : "var(--foreground)",
              border: msg.role === "vigil" ? "1px solid var(--border)" : "none",
            }}>
              {msg.role === "vigil" && (
                <span style={{ fontSize: "9px", color: "var(--muted-foreground)", letterSpacing: "0.15em", display: "block", marginBottom: "4px" }}>VIGIL</span>
              )}
              {msg.content}
            </div>
            {msg.willConfig && (
              <button
                onClick={() => handleApply(msg.willConfig)}
                style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "var(--foreground)", border: "1px solid var(--border)", padding: "3px 10px", borderRadius: "4px", background: "transparent", cursor: "pointer" }}
              >
                APPLY TO /CREATE
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ background: "var(--accent)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "9px", color: "var(--muted-foreground)", display: "block", marginBottom: "4px" }}>VIGIL</span>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input — fixed at bottom */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 12px", display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          defaultValue=""
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          placeholder="Describe your will..."
          style={{
            flex: 1,
            background: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--foreground)",
            outline: "none",
            resize: "none",
            overflow: "auto",
            lineHeight: "1.5",
            minHeight: "32px",
            maxHeight: "88px",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{ padding: "6px 12px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: "6px", fontFamily: "var(--font-mono)", fontSize: "11px", cursor: "pointer", opacity: loading ? 0.5 : 1 }}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const { chatState, toggleExpanded, goBack } = useChatState();
  const isExpanded = chatState.state !== "collapsed";

  return (
    <motion.div
      className="absolute bottom-0 inset-x-0 z-50"
      initial={{ y: PANEL_HEIGHT }}
      animate={{ y: isExpanded ? 0 : PANEL_HEIGHT }}
      transition={{ duration: 0.3, ease: "circInOut" }}
    >
      <ChatHeader
        variant="desktop"
        onClick={toggleExpanded}
        showBackButton={false}
        onBackClick={goBack}
      />
      <VIGILChat />
    </motion.div>
  );
}

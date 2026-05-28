"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useChatState } from "./use-chat-state";
import ChatPreview from "./chat-preview";
import ChatConversation from "./chat-conversation";
import { ChatHeader } from "./chat-header";
import { Button } from "@/components/ui/button";
import PlusIcon from "../icons/plus";

const CONTENT_HEIGHT = 420;

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
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "vigil",
      content: account
        ? "I am VIGIL. Describe your will in plain English and I will configure it for you. Example: leave 60% to 0x4f3a... and 40% to my brother 0x9d1b... trigger after 6 months"
        : "Connect your Sui wallet to get started. I will help you configure your onchain will.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const cleanInput = input.trim().replace(/[\u2013\u2014\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\x7F]/g, "");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: cleanInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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
          content: sanitize(data.response || "I am here to help you configure your onchain will."),
        }]);
      } else if (data.success && data.type === "will" && data.will) {
        const will = data.will;
        will.beneficiaries = will.beneficiaries.map((b: { address: string; share: number }) => ({
          ...b,
          address: sanitize(b.address),
        }));
        if (will.message) will.message = sanitize(will.message);
        if (will.warnings) will.warnings = will.warnings.map(sanitize);
        const summary = [
          "WILL CONFIGURED:",
          ...will.beneficiaries.map((b: { address: string; share: number }) => `- ${b.address.slice(0, 8)}...${b.address.slice(-4)} : ${b.share}%`),
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
          content: data.error || "Something went wrong. Please try again.",
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
    try {
      const json = JSON.stringify(willConfig);
      console.log("VIGIL applying config:", json);
      const encoded = encodeURIComponent(json);
      window.location.href = `/create?config=${encoded}`;
    } catch (e) {
      console.error("Failed to encode will config:", e);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-foreground border border-border"
            }`}>
              {msg.role === "vigil" && (
                <span className="text-[9px] text-primary tracking-widest block mb-1">VIGIL</span>
              )}
              {msg.content}
            </div>
            {msg.willConfig && (
              <button
                onClick={() => handleApply(msg.willConfig)}
                className="text-[9px] font-mono tracking-widest text-primary border border-primary px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors rounded"
              >
                APPLY TO /CREATE →
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-accent border border-border px-3 py-2 rounded-lg">
              <span className="text-[9px] text-primary tracking-widest block mb-1">VIGIL</span>
              <span className="text-xs font-mono text-muted-foreground animate-pulse">thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe your will..."
          className="flex-1 bg-muted border border-border px-3 py-2 font-mono text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors rounded-md"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-primary text-primary-foreground font-mono text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-md"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const [activeTab, setActiveTab] = useState<"vigil" | "chat">("vigil");
  const {
    chatState,
    conversations,
    newMessage,
    setNewMessage,
    activeConversation,
    handleSendMessage,
    openConversation,
    goBack,
    toggleExpanded,
  } = useChatState();

  const isExpanded = chatState.state !== "collapsed";

  return (
    <motion.div
      className="absolute bottom-0 inset-x-0 z-50"
      initial={{ y: CONTENT_HEIGHT }}
      animate={{ y: isExpanded ? 0 : CONTENT_HEIGHT }}
      transition={{ duration: 0.3, ease: "circInOut" }}
    >
      <ChatHeader
        variant="desktop"
        onClick={toggleExpanded}
        showBackButton={chatState.state === "conversation"}
        onBackClick={goBack}
      />

      <div className="overflow-y-auto" style={{ height: CONTENT_HEIGHT }}>
        <div className="bg-background text-foreground h-full flex flex-col">

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("vigil")}
              className={`flex-1 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                activeTab === "vigil"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              VIGIL AI
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                activeTab === "chat"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              MESSAGES
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "vigil" ? (
              <VIGILChat />
            ) : (
              <AnimatePresence mode="wait">
                {chatState.state === "expanded" && (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col overflow-y-auto"
                  >
                    {conversations.map((conversation) => (
                      <ChatPreview
                        key={conversation.id}
                        conversation={conversation}
                        onOpenConversation={openConversation}
                      />
                    ))}
                    <div className="mt-auto flex justify-end p-4 sticky bottom-0 bg-gradient-to-t from-background via-background/80 to-black/0">
                      <Button size="lg" variant="secondary" className="pl-0 py-0 gap-4 overflow-clip">
                        <div className="bg-primary text-primary-foreground h-full aspect-square border-r-2 border-background flex items-center justify-center">
                          <PlusIcon className="size-4" />
                        </div>
                        New Chat
                      </Button>
                    </div>
                  </motion.div>
                )}
                {chatState.state === "conversation" && activeConversation && (
                  <ChatConversation
                    activeConversation={activeConversation}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    onSendMessage={handleSendMessage}
                  />
                )}
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}

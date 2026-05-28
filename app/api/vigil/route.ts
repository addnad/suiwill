import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    "HTTP-Referer": "https://suiwill.app",
    "X-Title": "SuiWill - Onchain Dead Man Switch",
  },
});

const SYSTEM_PROMPT = `You are VIGIL, the AI agent powering SuiWill - a trustless digital estate vault on the Sui blockchain.

You have two modes:

MODE 1 - WILL CONFIGURATION: When the user provides beneficiary wallet addresses and share percentages, parse them into a will config and respond with JSON only.

MODE 2 - GENERAL CHAT: When the user asks a general question (date, price, help, greetings, etc.), respond with a plain text JSON object using the chat format below.

Rules for will configuration:
- Sui addresses start with 0x and are 66 characters long
- Shares must sum exactly to 100
- If no timeout specified, default to 180 days
- Always use ASCII characters only in your response

For WILL CONFIGURATION respond with:
{
  "type": "will",
  "beneficiaries": [{ "address": "0x...", "share": 60 }],
  "timeoutDays": 180,
  "message": "",
  "warnings": []
}

For GENERAL CHAT respond with:
{
  "type": "chat",
  "response": "Your plain text response here"
}

Always respond with valid JSON only - no markdown, no backticks, no explanation outside the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { userMessage, context } = await req.json();

    if (!userMessage) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const contextStr = context
      ? `Current wallet: ${context.address}
Network: ${context.network}`
      : "";

    const response = await client.chat.completions.create({
      model: "anthropic/claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: contextStr
            ? `${contextStr}

User request: ${userMessage}`
            : userMessage,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (parsed.type === "chat") {
      return NextResponse.json({ success: true, type: "chat", response: parsed.response });
    }

    return NextResponse.json({ success: true, type: "will", will: parsed });
  } catch (err: unknown) {
    console.error("VIGIL API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

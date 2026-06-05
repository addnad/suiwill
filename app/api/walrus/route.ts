import { NextRequest, NextResponse } from "next/server";

const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

export async function POST(req: NextRequest) {
  try {
    const { message, network } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ blobId: null });
    }

    const publisher = WALRUS_PUBLISHER;
    const epochs = 5;

    const res = await fetch(`${publisher}/v1/blobs?epochs=${epochs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new TextEncoder().encode(message),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Walrus upload failed:", err);
      return NextResponse.json({ error: "Walrus upload failed", detail: err }, { status: 500 });
    }

    const data = await res.json();

    const blobId =
      data?.newlyCreated?.blobObject?.blobId ??
      data?.alreadyCertified?.blobId ??
      null;

    if (!blobId) {
      console.error("No blob ID in Walrus response:", data);
      return NextResponse.json({ error: "No blob ID returned" }, { status: 500 });
    }

    return NextResponse.json({ blobId });
  } catch (err: unknown) {
    console.error("Walrus API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

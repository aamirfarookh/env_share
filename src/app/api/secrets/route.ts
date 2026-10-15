import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ciphertext, iv, salt, hasPassword, ttlSeconds, maxViews } = body;

    // Validation
    if (!ciphertext || typeof ciphertext !== "string") {
      return NextResponse.json(
        { error: "Ciphertext is required." },
        { status: 400 }
      );
    }

    // Payload size safeguard (prevent media abuse, max ~512KB)
    if (ciphertext.length > 512 * 1024) {
      return NextResponse.json(
        { error: "Secret payload exceeds maximum size limit (512KB)." },
        { status: 413 }
      );
    }

    if (!iv || typeof iv !== "string") {
      return NextResponse.json(
        { error: "Initialization vector (IV) is required." },
        { status: 400 }
      );
    }

    const ttl = Number(ttlSeconds) || 3600; // default 1 hour
    if (ttl < 60 || ttl > 30 * 86400) {
      return NextResponse.json(
        { error: "TTL must be between 1 minute and 30 days." },
        { status: 400 }
      );
    }

    const views = Number(maxViews) || 1; // default burn-after-reading (1 view)
    if (views < 1 || views > 1000) {
      return NextResponse.json(
        { error: "Max views must be between 1 and 1,000." },
        { status: 400 }
      );
    }

    const result = await storage.saveSecret({
      ciphertext,
      iv,
      salt: salt ? String(salt) : undefined,
      hasPassword: Boolean(hasPassword),
      ttlSeconds: ttl,
      maxViews: views,
    });

    return NextResponse.json(
      {
        id: result.id,
        deletionToken: result.deletionToken,
        expiresAt: result.expiresAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to store secret:", err);
    return NextResponse.json(
      { error: "Failed to store secret." },
      { status: 500 }
    );
  }
}

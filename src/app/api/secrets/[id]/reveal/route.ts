import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing secret ID" }, { status: 400 });
  }

  const payload = await storage.revealSecret(id);

  if (!payload) {
    return NextResponse.json(
      {
        error:
          "This secret does not exist, has expired, or has reached its maximum view limit and was destroyed.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    salt: payload.salt,
    hasPassword: payload.hasPassword,
    remainingViews: payload.remainingViews,
  });
}

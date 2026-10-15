import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing secret ID" }, { status: 400 });
  }

  const meta = await storage.getSecretMeta(id);
  if (!meta.exists) {
    return NextResponse.json(
      { error: "Secret not found or has already expired / burned." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: meta.id,
    exists: true,
    expiresAt: meta.expiresAt,
    remainingViews: meta.remainingViews,
    maxViews: meta.maxViews,
    hasPassword: meta.hasPassword,
    createdAt: meta.createdAt,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenHeader = req.headers.get("x-deletion-token");
  const tokenQuery = req.nextUrl.searchParams.get("token");
  const deletionToken = tokenHeader || tokenQuery;

  if (!deletionToken) {
    return NextResponse.json(
      { error: "Deletion token is required." },
      { status: 401 }
    );
  }

  const success = await storage.deleteSecret(id, deletionToken);
  if (!success) {
    return NextResponse.json(
      { error: "Secret not found or invalid deletion token." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Secret permanently deleted." });
}

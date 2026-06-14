import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    columns: { id: true, currentPrice: true, quantityAvailable: true, status: true },
  });

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(listing, {
    headers: { "Cache-Control": "no-store" },
  });
}

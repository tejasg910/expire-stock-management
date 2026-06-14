import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings, providers } from "@/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { isWithinRadius } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "5");

  const all = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      photoUrl: listings.photoUrl,
      currentPrice: listings.currentPrice,
      originalPrice: listings.originalPrice,
      quantityAvailable: listings.quantityAvailable,
      closeAt: listings.closeAt,
      providerName: providers.name,
      providerCategory: providers.category,
      providerLat: providers.latitude,
      providerLon: providers.longitude,
      providerAddress: providers.addressLine,
    })
    .from(listings)
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .where(and(eq(listings.status, "active"), gt(listings.closeAt, sql`now()`)));

  const filtered =
    isNaN(lat) || isNaN(lon)
      ? all
      : all.filter((l) =>
          isWithinRadius(lat, lon, Number(l.providerLat), Number(l.providerLon), radius)
        );

  return NextResponse.json(filtered, {
    headers: { "Cache-Control": "no-store" },
  });
}

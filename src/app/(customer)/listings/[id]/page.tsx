import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, providers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ListingDetail } from "@/components/listing-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;

  const result = await db
    .select({
      listing: listings,
      provider: providers,
    })
    .from(listings)
    .innerJoin(providers, eq(listings.providerId, providers.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!result.length) notFound();

  const { listing, provider } = result[0];

  return <ListingDetail listing={listing} provider={provider} />;
}

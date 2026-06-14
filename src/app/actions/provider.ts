"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { providers } from "@/db/schema";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

const OnboardSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(1),
  addressLine: z.string().min(5),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  defaultPickupWindowMinutes: z.coerce.number().int().min(5).max(30).default(15),
});

export async function onboardProvider(_prev: unknown, formData: FormData) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return { error: "Not authenticated" };

  // Create org if none exists yet, then set it as active
  let orgId = session.session.activeOrganizationId;

  if (!orgId) {
    const newOrg = await auth.api.createOrganization({
      headers: hdrs,
      body: {
        name: formData.get("name") as string,
        slug: crypto.randomUUID(),
      },
    });
    if (!newOrg) return { error: "Could not create organization" };
    orgId = newOrg.id;

    // Set it as the active org on the session
    await auth.api.setActiveOrganization({
      headers: hdrs,
      body: { organizationId: orgId },
    });
  }

  const parsed = OnboardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.query.providers.findFirst({
    where: eq(providers.orgId, orgId),
  });
  if (existing) return { error: "Provider already registered" };

  await db.insert(providers).values({
    orgId,
    ...parsed.data,
    latitude: String(parsed.data.latitude),
    longitude: String(parsed.data.longitude),
  });

  redirect("/provider/dashboard");
}

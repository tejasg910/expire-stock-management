"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { follows } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

const FollowSchema = z.object({
  providerId: z.string().uuid(),
});

export async function followProvider(_prev: unknown, formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Please verify your phone first" };

  const parsed = FollowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid provider" };

  const { providerId } = parsed.data;
  const existing = await db.query.follows.findFirst({
    where: and(eq(follows.userId, session.user.id), eq(follows.providerId, providerId)),
  });

  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.userId, session.user.id), eq(follows.providerId, providerId)));
    revalidatePath(`/listings`);
    return { success: true, following: false };
  }

  await db.insert(follows).values({ userId: session.user.id, providerId });
  revalidatePath(`/listings`);
  return { success: true, following: true };
}

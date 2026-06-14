import { Resend } from "resend";
import { db } from "@/db";
import { notifications } from "@/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyCustomer(
  userId: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    channel: "in_app",
    kind,
    payload,
  });
  console.log(`[notify:customer] ${userId} → ${kind}`, payload);
}

export async function notifyProvider(
  listingId: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(notifications).values({
    userId: null,
    channel: "in_app",
    kind,
    payload: { listingId, ...payload },
  });
  console.log(`[notify:provider] listing:${listingId} → ${kind}`, payload);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:stub] to=${to} subject=${subject}`);
    return;
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "LastBite <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

import { BrevoClient } from "@getbrevo/brevo";
import { db } from "@/db";
import { notifications } from "@/db/schema";

function getBrevoClient() {
  const key = process.env.BREVO_API_KEY;
  if (!key) return null;
  return new BrevoClient({ apiKey: key });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const client = getBrevoClient();
  if (!client) {
    console.log(`[email:stub] to=${to} subject=${subject}`);
    return;
  }

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_FROM_EMAIL ?? "tejasgiri910@gmail.com",
      name: process.env.BREVO_FROM_NAME ?? "LastBite",
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });

}

export async function notifyCustomer(
  userId: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(notifications).values({ userId, channel: "in_app", kind, payload });
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

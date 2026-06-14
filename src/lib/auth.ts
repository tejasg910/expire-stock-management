import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import * as appSchema from "@/db/schema";
import { sendEmail } from "@/lib/notify";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...authSchema, ...appSchema },
  }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendEmail(
          email,
          `Your LastBite code: ${otp}`,
          `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#f97316;margin:0 0 8px">LastBite</h2>
            <p style="color:#374151;margin:0 0 24px">Your one-time code:</p>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:24px;text-align:center">
              <span style="font-size:36px;font-weight:700;letter-spacing:0.2em;color:#111827;font-family:monospace">${otp}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;margin:16px 0 0">Expires in 10 minutes. Don't share this with anyone.</p>
          </div>`
        );
        if (!process.env.BREVO_API_KEY) console.log(`[OTP] ${email} → ${otp} (type: ${type})`);
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
});

export type Auth = typeof auth;

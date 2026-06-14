import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

// Singleton to survive Next.js HMR without exhausting connections
const globalForDb = globalThis as unknown as { client: ReturnType<typeof postgres> | undefined };

const client =
  globalForDb.client ??
  postgres(process.env.DATABASE_URL!, { ssl: "require", max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, {
  schema: { ...schema, ...authSchema },
  logger: process.env.NODE_ENV === "development",
});

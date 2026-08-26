import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __lifeosDbClient: postgres.Sql | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the connection across hot reloads / module reloads in dev.
const client = globalThis.__lifeosDbClient ?? postgres(process.env.DATABASE_URL, { max: 10 });
if (process.env.NODE_ENV !== "production") {
  globalThis.__lifeosDbClient = client;
}

export const db = drizzle(client, { schema });
export * as schema from "./schema";

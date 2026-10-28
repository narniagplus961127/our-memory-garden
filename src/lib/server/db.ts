import "server-only";
import postgres from "postgres";
let sql: ReturnType<typeof postgres> | undefined;
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("The garden database is not configured.");
  return (sql ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl:
      new URL(process.env.DATABASE_URL).hostname === "127.0.0.1"
        ? false
        : "require",
  }));
}

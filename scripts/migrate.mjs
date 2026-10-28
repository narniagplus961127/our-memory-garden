import { readFile, readdir } from "node:fs/promises";
import postgres from "postgres";
const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connection)
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
const sql = postgres(connection, {
  max: 1,
  ssl: new URL(connection).hostname === "127.0.0.1" ? false : "require",
});
try {
  await sql`create table if not exists garden_migrations(name text primary key,applied_at timestamptz not null default now())`;
  for (const file of (await readdir("db/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    if (
      (await sql`select name from garden_migrations where name=${file}`).length
    )
      continue;
    const text = await readFile("db/migrations/" + file, "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(text);
      await transaction`insert into garden_migrations(name) values(${file})`;
    });
    console.log("Applied " + file);
  }
} finally {
  await sql.end();
}

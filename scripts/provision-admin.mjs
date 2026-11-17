import postgres from "postgres";
const [id, email] = process.argv.slice(2);
if (!id || !email || !process.env.DATABASE_URL)
  throw new Error(
    "Usage: node --env-file=.env.local scripts/provision-admin.mjs USER_ID EMAIL",
  );
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl:
    new URL(process.env.DATABASE_URL).hostname === "127.0.0.1"
      ? false
      : "require",
});
try {
  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(17702601)`;
    await transaction`insert into garden_administrators(user_id,email) values(${id},${email.toLowerCase()}) on conflict(user_id) do update set email=excluded.email`;
  });
  console.log("Administrator allowlist updated.");
} finally {
  await sql.end();
}

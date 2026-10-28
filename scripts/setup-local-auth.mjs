import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { localAuthOptions } from "../src/lib/server/local-auth.ts";
import postgres from "postgres";
if ((process.env.AUTH_MODE ?? process.env.AUTH_PROVIDER) !== "local")
  throw new Error("This script only provisions local development identities.");
const options = localAuthOptions(true);
const { runMigrations } = await getMigrations(options);
await runMigrations();
const auth = betterAuth(options);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const [email, password, name, admin] of [
    [
      process.env.TEST_ADMIN_EMAIL,
      process.env.TEST_ADMIN_PASSWORD,
      "First gardener",
      true,
    ],
    [
      process.env.TEST_OTHER_EMAIL,
      process.env.TEST_OTHER_PASSWORD,
      "Second gardener",
      true,
    ],
    [
      process.env.TEST_OUTSIDER_EMAIL,
      process.env.TEST_OUTSIDER_PASSWORD,
      "Visitor",
      false,
    ],
  ]) {
    if (!email || !password) throw new Error("Missing local test credentials.");
    const existing = await sql`select id from "user" where email=${email}`;
    let id = existing[0]?.id;
    if (!id) {
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
      });
      id = result.user.id;
    }
    if (admin)
      await sql`insert into garden_administrators(user_id,email) values(${id},${email}) on conflict(user_id) do nothing`;
  }
  console.log(
    "Provisioned two local test administrators and one non-administrator.",
  );
} finally {
  await sql.end();
  await options.database.end();
}

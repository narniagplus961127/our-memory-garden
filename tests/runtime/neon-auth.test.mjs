import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import postgres from "postgres";
import { NEON_AUTH_SESSION_DATA_COOKIE_NAME } from "@neondatabase/auth/server";

// Requires `npm run build`; this deliberately exercises the managed SDK in
// production mode while all identities, auth responses and data stay local.
test(
  "Neon authorization initializes and revalidates a cached administrator session",
  { timeout: 60000 },
  async (t) => {
    assert.equal(
      new URL(process.env.DATABASE_URL).hostname,
      "127.0.0.1",
      "runtime regression requires the isolated loopback database",
    );
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    const [admin] =
      await sql`select user_id, email from garden_administrators order by email limit 1`;
    await sql.end();
    assert.ok(admin, "prepare local fixture administrators first");
    let active = true;
    const sessions = [];
    const session = {
      user: {
        id: admin.user_id,
        email: admin.email,
        name: "Local runtime administrator",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: {
        id: "local-neon-runtime-session",
        userId: admin.user_id,
        token: "local-fixture-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    const upstream = createServer((request, response) => {
      const url = new URL(request.url, "http://127.0.0.1");
      response.setHeader("Content-Type", "application/json");
      if (url.pathname === "/sign-in/email") {
        response.setHeader(
          "Set-Cookie",
          "__Secure-neon-auth.session_token=local-fixture-token; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        response.end(JSON.stringify(session));
      } else if (url.pathname === "/get-session") {
        sessions.push(url.searchParams.get("disableCookieCache"));
        response.end(
          JSON.stringify(
            active && request.headers.cookie?.includes("local-fixture-token")
              ? session
              : null,
          ),
        );
      } else {
        response.writeHead(404);
        response.end("{}");
      }
    });
    upstream.listen(0, "127.0.0.1");
    await once(upstream, "listening");
    t.after(() => new Promise((resolve) => upstream.close(resolve)));
    // NEXT_PUBLIC_APP_URL is fixed by the preceding production build.
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
    assert.equal(appUrl.hostname, "127.0.0.1");
    assert.equal(appUrl.protocol, "http:");
    const port = Number(appUrl.port);
    assert.ok(
      port > 0,
      "use the built local fixture origin with its explicit port",
    );
    const base = appUrl.origin;
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        windowsHide: true,
        env: {
          ...process.env,
          NODE_ENV: "production",
          AUTH_MODE: "neon",
          NEXT_PUBLIC_APP_URL: base,
          NEON_AUTH_BASE_URL: "http://127.0.0.1:" + upstream.address().port,
          NEON_AUTH_COOKIE_SECRET: "local-neon-runtime-regression-secret-only",
        },
        stdio: "ignore",
      },
    );
    t.after(() => {
      if (process.platform === "win32")
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else child.kill();
    });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch(base + "/login")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "production-mode local app starts");
    assert.equal(
      (await fetch(base + "/garden/runtime-regression-missing-page")).status,
      404,
      "managed auth initialization must not turn an absent page into HTTP 500",
    );
    assert.equal(
      (await fetch(base + "/admin", { redirect: "manual" })).status,
      307,
    );
    assert.equal((await fetch(base + "/api/pages")).status, 401);
    const signedIn = await fetch(base + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: admin.email,
        password: "local-fixture-only",
      }),
    });
    assert.equal(signedIn.status, 200);
    const setCookies = signedIn.headers.getSetCookie();
    assert.ok(
      setCookies.some((value) =>
        value.startsWith(NEON_AUTH_SESSION_DATA_COOKIE_NAME + "="),
      ),
      "real pinned SDK minted a signed cached session",
    );
    const cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
    sessions.length = 0;
    assert.equal(
      (await fetch(base + "/api/pages", { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    assert.deepEqual(
      sessions,
      ["true"],
      "authorization asks upstream even with a valid signed cache",
    );
    active = false;
    sessions.length = 0;
    assert.equal(
      (await fetch(base + "/api/pages", { headers: { Cookie: cookie } }))
        .status,
      401,
      "revoked upstream session cannot retain administrator access through its cached cookie",
    );
    assert.deepEqual(sessions, ["true"]);
  },
);

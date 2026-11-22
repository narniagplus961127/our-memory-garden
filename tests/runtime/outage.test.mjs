import test from "node:test";
import assert from "node:assert/strict";
import { createServer, connect } from "node:net";
import { once } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { chromium, devices } from "@playwright/test";
import { createServer as httpServer } from "node:http";
import postgres from "postgres";

// Run after a production build, with the isolated local database and no other
// application on NEXT_PUBLIC_APP_URL. The fault is external to application code.
test(
  "production outage screens retry public and administrator reads",
  { timeout: 120000 },
  async (t) => {
    const database = new URL(process.env.DATABASE_URL);
    const base = new URL(process.env.NEXT_PUBLIC_APP_URL);
    assert.equal(database.hostname, "127.0.0.1");
    assert.equal(base.hostname, "127.0.0.1");
    assert.equal(base.protocol, "http:");
    const sql = postgres(database.href, { max: 1 });
    t.after(() => sql.end());
    const [admin] =
      await sql`select user_id,email from garden_administrators order by email limit 1`;
    assert.ok(admin);
    const session = {
      user: {
        id: admin.user_id,
        email: admin.email,
        name: "Local outage fixture",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: {
        id: "local-outage-session",
        userId: admin.user_id,
        token: "local-outage-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    const auth = httpServer((request, response) => {
      response.setHeader("Content-Type", "application/json");
      if (request.url.startsWith("/sign-in/email")) {
        response.setHeader(
          "Set-Cookie",
          "__Secure-neon-auth.session_token=local-outage-token; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        response.end(JSON.stringify(session));
      } else
        response.end(
          JSON.stringify(
            request.headers.cookie?.includes("local-outage-token")
              ? session
              : null,
          ),
        );
    });
    auth.listen(0, "127.0.0.1");
    await once(auth, "listening");
    t.after(() => new Promise((resolve) => auth.close(resolve)));
    let blocked = false;
    const sockets = new Set();
    const proxy = createServer((downstream) => {
      if (blocked) return downstream.destroy();
      const upstream = connect(Number(database.port), database.hostname);
      for (const socket of [upstream, downstream]) {
        sockets.add(socket);
        socket.on("error", () => {
          upstream.destroy();
          downstream.destroy();
        });
        socket.on("close", () => sockets.delete(socket));
      }
      upstream.pipe(downstream).pipe(upstream);
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    t.after(() => {
      for (const socket of sockets) socket.destroy();
      return new Promise((resolve) => proxy.close(resolve));
    });
    const proxied = new URL(database);
    proxied.port = String(proxy.address().port);
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        base.port,
      ],
      {
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          NODE_ENV: "production",
          AUTH_MODE: "neon",
          NEON_AUTH_BASE_URL: "http://127.0.0.1:" + auth.address().port,
          NEON_AUTH_COOKIE_SECRET: "local-neon-outage-regression-secret-only",
          DATABASE_URL: proxied.href,
        },
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
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base.origin + "/login")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready);
    const browser = await chromium.launch();
    t.after(() => browser.close());
    for (const mobile of [false, true]) {
      const context = await browser.newContext(
        mobile ? { ...devices["iPhone 13"] } : {},
      );
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const fault = () => {
        blocked = true;
        for (const socket of sockets) socket.destroy();
      };
      fault();
      await page.goto(base.origin + "/garden");
      await page
        .getByRole("heading", { name: "Our garden needs a moment" })
        .waitFor();
      assert.equal(
        await page
          .getByText(/ECONN|postgres|password|connection refused/i)
          .count(),
        0,
      );
      blocked = false;
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Garden", exact: true })
        .waitFor();
      const login = await context.request.post(
        base.origin + "/api/auth/sign-in/email",
        {
          headers: { Origin: base.origin },
          data: {
            email: admin.email,
            password: "local-fixture-only",
          },
        },
      );
      assert.equal(login.status(), 200);
      await context.addCookies(
        login
          .headersArray()
          .filter((h) => h.name.toLowerCase() === "set-cookie")
          .map((h) => {
            const pair = h.value.split(";")[0];
            const index = pair.indexOf("=");
            return {
              name: pair.slice(0, index),
              value: pair.slice(index + 1),
              domain: base.hostname,
              path: "/",
              secure: true,
            };
          }),
      );
      await page.goto(base.origin + "/admin/pages");
      await page.getByRole("heading", { name: "Pages", exact: true }).waitFor();
      fault();
      await page.reload();
      await page
        .getByRole("heading", { name: "The dashboard needs a moment" })
        .waitFor();
      await page.getByText(/keep the original editor tab open/).waitFor();
      blocked = false;
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page.getByRole("heading", { name: "Pages", exact: true }).waitFor();
      await context.close();
    }
  },
);

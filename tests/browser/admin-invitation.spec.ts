import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import postgres from "postgres";

const env = parseEnv(await readFile(".env.test", "utf8"));

test("a third administrator verifies their invitation before gaining access", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const connection = process.env.DATABASE_URL;
  const isolated =
    Boolean(connection) &&
    process.env.AUTH_MODE === "local" &&
    new URL(connection!).hostname === "127.0.0.1" &&
    new URL(connection!).pathname.startsWith("/garden_invitation_test");
  test.skip(
    !isolated,
    "This test needs a separate garden_invitation_test database with the two local administrator fixtures.",
  );
  const sql = postgres(connection!, { max: 1 });
  const email = "invite-" + crypto.randomUUID() + "@example.test";
  const password = "Garden invitation password 42";
  const headers = { Origin: baseURL! };
  const visitor = await browser.newContext({
    baseURL,
    viewport: page.viewportSize()!,
    isMobile: testInfo.project.name === "mobile",
  });
  try {
    expect(
      (
        await visitor.request.post("/api/admin/invitations", {
          headers,
          data: { email, name: "Invited gardener" },
        })
      ).status(),
    ).toBe(401);
    const owner = await page.request.post("/api/auth/sign-in/email", {
      headers,
      data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
    });
    expect(owner.ok()).toBeTruthy();
    const [beforeInvitation] = await sql<{ count: number }[]>`
      select count(*)::int as count from garden_administrators
    `;
    expect(beforeInvitation.count).toBe(2);
    await page.goto("/admin/settings/account");
    await page.getByLabel("Name", { exact: true }).fill("Invited gardener");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page
      .getByRole("button", { name: "Create invitation", exact: true })
      .click();
    const link = page.getByLabel("Invitation link", { exact: true });
    await expect(link).toHaveValue(/\/invite#[A-Za-z0-9_-]{43}$/);
    const stale = new URL(await link.inputValue()).hash.slice(1);
    await sql`update garden_admin_invitations set expires_at=now()-interval '1 second' where email=${email}`;
    expect(
      (
        await visitor.request.post("/api/invitations", {
          headers,
          data: { action: "details", token: stale },
        })
      ).status(),
    ).toBe(404);
    const renewal = await page.request.post("/api/admin/invitations", {
      headers,
      data: { email, name: "Invited gardener" },
    });
    expect(renewal.status()).toBe(201);
    const renewedUrl = (await renewal.json()).url;
    const token = new URL(renewedUrl).hash.slice(1);
    const accept = (action: string, data = {}, key = token) =>
      visitor.request.post("/api/invitations", {
        headers,
        data: { action, token: key, ...data },
      });
    expect((await accept("details", {}, stale)).status()).toBe(404);
    expect(
      (
        await visitor.request.post("/api/auth/sign-up/email", {
          headers,
          data: { email, name: "Invited gardener", password },
        })
      ).status(),
    ).toBe(404);
    expect((await accept("verify", { code: "000000" })).status()).toBe(403);

    const view = await visitor.newPage();
    await view.goto(renewedUrl);
    await expect(view.getByText(email, { exact: true })).toBeVisible();
    await view.getByLabel("Choose a password", { exact: true }).fill(password);
    await view.getByRole("button", { name: "Continue", exact: true }).click();
    const codeInput = view.getByLabel("Email verification code", {
      exact: true,
    });
    await expect(codeInput).toBeVisible();
    await expect(
      view.getByText("Check your email for the verification code."),
    ).toBeVisible();
    const { otp } = JSON.parse(
      await readFile(
        "work/local-mail/" + encodeURIComponent(email) + ".otp.json",
        "utf8",
      ),
    );
    await view.reload();
    await expect(codeInput).toBeVisible();
    expect((await accept("resend")).status()).toBe(429);
    expect(
      (
        await visitor.request.post("/api/auth/sign-in/email", {
          headers,
          data: { email, password },
        })
      ).status(),
    ).toBe(401);
    const differentBrowser = await browser.newContext({ baseURL });
    try {
      expect(
        (
          await differentBrowser.request.post("/api/invitations", {
            headers,
            data: { action: "verify", token, code: otp },
          })
        ).status(),
      ).toBe(403);
    } finally {
      await differentBrowser.close();
    }
    await codeInput.fill(otp === "000000" ? "000001" : "000000");
    await view.getByRole("button", { name: "Verify and accept" }).click();
    await expect(
      view.getByText("That code is incorrect or has expired.", { exact: true }),
    ).toBeVisible();
    await codeInput.fill(otp);
    await view.getByRole("button", { name: "Verify and accept" }).click();
    await expect(view.getByText("Your garden access is ready.")).toBeVisible();
    expect((await accept("details")).status()).toBe(404);
    expect(
      (
        await visitor.request.post("/api/auth/sign-in/email", {
          headers,
          data: { email, password },
        })
      ).ok(),
    ).toBeTruthy();
    await view.goto("/admin/settings/account");
    await expect(
      view.getByText("You are signed in as " + email + "."),
    ).toBeVisible();
    const duplicate = await page.request.post("/api/admin/invitations", {
      headers,
      data: { email, name: "Invited gardener" },
    });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: "This email already has garden access.",
    });
  } finally {
    await visitor.close();
    await sql`delete from garden_admin_invitations where email=${email}`;
    await sql`delete from garden_administrators where email=${email}`;
    await sql.end();
  }
});

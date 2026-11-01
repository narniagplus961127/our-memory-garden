import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const artifactDirectory = process.env.TEST_ARTIFACT_DIR || "work";
await mkdir(artifactDirectory, { recursive: true });
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
}
test("search shared photos, confirm unused deletion, and retry a failed request", async ({
  page,
  isMobile,
}) => {
  await signIn(page);
  await page.goto("/admin/media");
  const name = "unused-" + Date.now() + ".png";
  const buffer = await sharp({
    create: { width: 120, height: 100, channels: 3, background: "#769270" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload photos", { exact: true })
    .setInputFiles({ name, mimeType: "image/png", buffer });
  await expect(
    page
      .getByRole("list", { name: "Upload progress" })
      .getByText("Ready", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find a photo").fill(name);
  await expect(page.locator(".media-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Photo details " + name, exact: true })
    .click();
  await page.getByRole("button", { name: "Delete photo", exact: true }).click();
  await expect(
    page.getByText("Delete this photo permanently?", { exact: true }),
  ).toBeVisible();
  let failed = false;
  await page.route("**/api/media/*", async (route) => {
    if (route.request().method() === "DELETE" && !failed) {
      failed = true;
      await route.abort("failed");
    } else if (route.request().method() === "DELETE") {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.screenshot({
    path:
      artifactDirectory +
      "/media-delete-" +
      (isMobile ? "mobile" : "desktop") +
      ".png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Retry deletion", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".media-card")).toHaveCount(0);
});
test("settings show measured storage and create a protected independent archive", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000);
  await signIn(page);
  await page.goto("/admin/settings");
  await page
    .getByRole("link", { name: "View storage usage →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Storage use", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/bucket listing/)).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh usage", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh usage", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(/Updated/)).toBeVisible();
  await expect(page.getByText("NaN MB", { exact: true })).toHaveCount(0);
  await page.route("**/api/storage", (route) => route.abort("failed"));
  await page
    .getByRole("button", { name: "Refresh usage", exact: true })
    .click();
  await expect(page.getByText(/Last confirmed value is stale/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Could not refresh usage", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/storage");
  await page
    .getByRole("button", { name: "Retry refresh", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh usage", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path:
      artifactDirectory +
      "/storage-" +
      (isMobile ? "mobile" : "desktop") +
      ".png",
    fullPage: true,
  });
  await page.goto("/admin/settings");
  await page
    .getByRole("link", { name: "Export garden →", exact: true })
    .click();
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/exports" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Create.*export/ }).click();
  expect((await created).status()).toBe(202);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your export is ready", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("link", { name: "Download manifest", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: /^Download part / })
    .first()
    .click();
  expect((await download).suggestedFilename()).toMatch(
    /our-memory-garden.*\.tar$/,
  );
  await page.screenshot({
    path:
      artifactDirectory +
      "/export-" +
      (isMobile ? "mobile" : "desktop") +
      ".png",
    fullPage: true,
  });
  await page.route("**/api/exports/*/parts/*/download", (route) =>
    route.request().method() === "HEAD"
      ? route.fulfill({ status: 410 })
      : route.continue(),
  );
  await page
    .getByRole("link", { name: /^Download part / })
    .first()
    .click();
  await expect(
    page.getByText("This export expired. Create a fresh export.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create fresh export", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("cancel an active multipart preparation without a late response resuming it", async ({
  page,
}) => {
  await signIn(page);
  const latest = await (await page.request.get("/api/exports")).json();
  if (latest && !latest.expired && latest.status !== "ready") {
    const canceled = await page.request.delete("/api/exports/" + latest.id, {
      headers: { Origin: env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL },
      data: { confirm: true },
    });
    expect(canceled.status()).toBe(200);
  }
  await page.goto("/admin/settings/export");
  let release: () => void = () => {},
    notify: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    prepared = new Promise<void>((resolve) => {
      notify = resolve;
    });
  await page.route("**/api/exports/*/prepare", async (route) => {
    const response = await route.fetch();
    notify();
    await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  try {
    const created = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/exports" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Create.*export/ }).click();
    expect((await created).status()).toBe(202);
    await prepared;
    await expect(
      page.getByRole("button", { name: "Cancel export", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Cancel export", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm cancellation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Create fresh export", exact: true }),
    ).toBeEnabled();
    const response = page.waitForResponse((response) =>
      response.url().endsWith("/prepare"),
    );
    release();
    await response;
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(
      page.getByRole("button", { name: "Create fresh export", exact: true }),
    ).toBeEnabled();
  } finally {
    release();
  }
});

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
test("administrator reviews history, confirms restore and safely recovers a trashed page", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: origin },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  let p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Recovery journey " + Date.now() },
    })
  ).json();
  const title = p.title;
  const revision = p.version;
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers: { Origin: origin },
      data: {
        version: p.version,
        title: "Latest recovery journey",
        text: "Memory before restoration",
        visibility: "public",
      },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id + "/history?version=" + revision);
  await expect(
    page.getByRole("heading", { name: "Version history", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Read-only saved snapshot" }),
  ).toContainText(title);
  await page
    .getByRole("button", { name: "Restore this version", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirm version restoration" }),
  ).toContainText("current saved version will be kept");
  await page
    .getByRole("button", { name: "Confirm restore version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Version restored");
  const saved = await (await page.request.get("/api/pages/" + p.id)).json();
  expect(saved.title).toBe(title);
  expect(saved.visibility).toBe("public");
  await page
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Confirm page action" }),
  ).toContainText("Links to this page");
  await page
    .getByRole("button", { name: "Confirm move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Page moved to trash." }),
  ).toBeVisible();
  await page.goto("/admin/trash");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card
    .getByRole("button", { name: "Restore as private", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Confirm restore as private", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/pages/" + p.id)).json()).visibility,
  ).toBe("private");
  await page.goto("/admin/pages/" + p.id + "/history");
  await page
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Page moved to trash." }),
  ).toBeVisible();
  await page.goto("/admin/trash");
  await card
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    card.getByRole("region", { name: "Confirm page action" }),
  ).toContainText("cannot be undone");
  await card.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await card
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(card).toHaveCount(0);
});
test("anonymous history and trash are denied", async ({ page }) => {
  for (const path of [
    "/admin/trash",
    "/admin/pages/00000000-0000-4000-8000-000000000000/history",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  for (const path of [
    "/api/trash",
    "/api/pages/00000000-0000-4000-8000-000000000000/history",
  ])
    expect((await page.request.get(path)).status()).toBe(401);
});
test("failed restoration retains the read-only snapshot and can be retried", async ({
  page,
}, testInfo) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  let p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Retry history " + Date.now() },
    })
  ).json();
  const oldTitle = p.title;
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers: { Origin: origin },
      data: { version: p.version, title: "Current retry title" },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id + "/history?version=1");
  await page.route("**/api/pages/*/history/1", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Connection interrupted. Current content is safe.",
          }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Restore this version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm restore version", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Connection interrupted" }),
  ).toContainText("Connection interrupted");
  await expect(
    page.getByRole("region", { name: "Read-only saved snapshot" }),
  ).toContainText(oldTitle);
  expect(
    (await (await page.request.get("/api/pages/" + p.id)).json()).title,
  ).toBe("Current retry title");
  await page.screenshot({
    path: "work/history-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await page.unroute("**/api/pages/*/history/1");
  await page
    .getByRole("button", { name: "Retry restore", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Version restored");
});

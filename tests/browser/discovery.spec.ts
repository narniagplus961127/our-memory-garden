import { test, expect } from "@playwright/test";
import fs from "node:fs";
const env = Object.fromEntries(
  fs
    .readFileSync(".env.test", "utf8")
    .split(/\r?\n/)
    .filter((x) => x && !x.startsWith("#"))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    }),
);
test("sharing controls autosave, recover offline edits, and disable public discovery for private pages", async ({
  page,
}, info) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const headers = { Origin: new URL(page.url()).origin };
  let p = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Sharing journey " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Sharing title", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Private pages cannot be shared or indexed."),
  ).toBeVisible();
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers,
      data: { version: p.version, visibility: "public" },
    })
  ).json();
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const photoName = "Sharing picker " + Date.now() + ".jpg";
  const upload = await (
    await page.request.post("/api/media/uploads", {
      headers,
      data: { name: photoName, size: bytes.length, type: "image/jpeg" },
    })
  ).json();
  expect(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/media/" + upload.id + "/complete", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(200);
  await page
    .getByRole("button", { name: "Choose sharing cover photo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use photo " + photoName, exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "Selected sharing cover photo",
      exact: true,
    }),
  ).toHaveAttribute("src", "/api/media/" + upload.id + "/display");
  await page
    .getByLabel("Sharing title", { exact: true })
    .fill("Our quiet evening");
  await page
    .getByLabel("Sharing description", { exact: true })
    .fill("A walk under the old trees.");
  await page.getByLabel("Allow search indexing", { exact: true }).uncheck();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Sharing title", { exact: true })).toHaveValue(
    "Our quiet evening",
  );
  await expect(
    page.getByLabel("Allow search indexing", { exact: true }),
  ).not.toBeChecked();
  await page.route("**/api/pages/" + p.id + "/details", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Connection unavailable." }),
    }),
  );
  await page
    .getByLabel("Sharing title", { exact: true })
    .fill("An unsaved evening");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Unsaved · Retry");
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Sharing title", { exact: true })).toHaveValue(
    "An unsaved evening",
  );
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Recovered · unsaved");
  await page.unroute("**/api/pages/" + p.id + "/details");
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details"))
            .length,
        p.id,
      ),
    )
    .toBe(0);
  expect(
    (await page.locator(".sharing-indexing").boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  if (info.project.name === "desktop") {
    await page
      .getByLabel("Sharing title", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "work/discovery-desktop-title.png" });
    await page
      .getByLabel("Allow search indexing", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "work/discovery-desktop.png" });
  } else {
    await page
      .locator(".sharing-fields")
      .screenshot({ path: "work/discovery-mobile.png" });
  }
  const html = await (
    await page.request.get("/garden/" + p.slug, {
      headers: { "User-Agent": "Twitterbot" },
    })
  ).text();
  expect(html).toContain('property="og:title" content="An unsaved evening"');
});
test("older details device copies recover organization without overwriting current sharing settings", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const headers = { Origin: new URL(page.url()).origin };
  let p = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Legacy sharing recovery " + Date.now() },
    })
  ).json();
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers,
      data: { version: p.version, visibility: "public" },
    })
  ).json();
  // Keep the device copy in the original07 shape before sharing fields existed.
  await page.goto("/admin/pages/" + p.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.route("**/api/pages/" + p.id + "/details", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Offline" }),
    }),
  );
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-28");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Unsaved · Retry");
  await page.evaluate((id) => {
    const key = Object.keys(localStorage).find((k) =>
      k.includes(id + ":details:"),
    )!;
    const r = JSON.parse(localStorage.getItem(key)!);
    for (const value of [r.baseDetails, r.details])
      for (const field of [
        "sharingTitle",
        "sharingDescription",
        "sharingCoverPhotoId",
        "allowIndexing",
      ])
        delete value[field];
    localStorage.setItem(key, JSON.stringify(r));
  }, p.id);
  await page.unroute("**/api/pages/" + p.id + "/details");
  const saved = await page.request.patch("/api/pages/" + p.id + "/details", {
    headers,
    data: {
      date: null,
      categoryId: null,
      coverPhotoId: null,
      metadataVersion: p.metadata_version,
      sharingTitle: "Independently saved sharing title",
      sharingDescription: "A separate administrator changed discovery.",
      sharingCoverPhotoId: null,
      allowIndexing: false,
    },
  });
  expect(saved.status()).toBe(200);
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-28",
  );
  await expect(page.getByLabel("Sharing title", { exact: true })).toHaveValue(
    "Independently saved sharing title",
  );
  await expect(
    page.getByLabel("Allow search indexing", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  const current = await (await page.request.get("/api/pages/" + p.id)).json();
  expect(current.page_date).toBe("2026-10-28");
  expect(current.sharing_title).toBe("Independently saved sharing title");
  expect(current.allow_indexing).toBe(false);
});

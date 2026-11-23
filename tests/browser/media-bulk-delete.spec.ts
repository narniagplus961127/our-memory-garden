import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import sharp from "sharp";
const env = parseEnv(readFileSync(".env.test", "utf8"));
test("bulk deletion preserves used photos and keeps failures selected for retry", async ({
  page,
}, testInfo) => {
  const headers = {
    Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
  };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const prefix = "Bulk delete " + crypto.randomUUID().slice(0, 8);
  const buffer = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#769270" },
  })
    .png()
    .toBuffer();
  const photos: { id: string; name: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const name = prefix + i + ".png";
    const upload = await (
      await page.request.post("/api/media/uploads", {
        headers,
        data: { name, size: buffer.length, type: "image/png" },
      })
    ).json();
    expect(
      (
        await page.request.put(upload.uploadUrl, {
          headers: { "Content-Type": "image/png" },
          data: buffer,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.post("/api/media/" + upload.id + "/complete", {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
    photos.push({ id: upload.id, name });
  }
  const entry = await (
    await page.request.post("/api/pages", { headers, data: { title: prefix } })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + entry.id + "/details", {
        headers,
        data: {
          date: null,
          metadataVersion: entry.metadata_version,
          coverPhotoId: photos[0].id,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const deletes: string[] = [];
  let failedOnce = false;
  await page.route("**/api/media/*", async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    const id = new URL(route.request().url()).pathname.split("/").at(-1)!;
    deletes.push(id);
    if (id === photos[2].id && !failedOnce) {
      failedOnce = true;
      return route.fulfill({
        status: 503,
        json: { error: "Temporary deletion failure. Please retry." },
      });
    }
    return route.continue();
  });
  await page.goto("/admin/media");
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(prefix);
  await expect(page.locator(".media-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Select photos", exact: true }),
  ).toHaveCount(0);
  const choices = page.getByRole("button", {
    name: /^Toggle selection for Bulk delete/,
  });
  await expect(choices).toHaveCount(3);
  await choices.first().click();
  await expect
    .poll(() =>
      choices
        .first()
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
  await expect(
    page.getByRole("region", { name: "Selected photos", exact: true }),
  ).toBeVisible();
  await choices.last().click({ modifiers: ["Shift"] });
  await expect(
    page.getByText("3 selected · 1 in use", { exact: true }),
  ).toBeVisible();
  await choices.nth(1).click({ modifiers: ["Control"] });
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(2);
  await choices.nth(1).click({ modifiers: ["Meta"] });
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(3);
  await page.locator(".media-card").last().scrollIntoViewIfNeeded();
  const floating = page.getByRole("region", {
    name: "Selected photos",
    exact: true,
  });
  const bounds = await floating.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.screenshot({
    path: testInfo.outputPath("media-floating-selection.png"),
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected photos", exact: true }),
  ).toHaveCount(0);
  await choices.first().focus();
  await page.keyboard.press("Control+a");
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(3);
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  const checks = page.getByRole("checkbox", { name: /^Select Bulk delete/ });
  await checks.first().press("Space");
  await checks.last().click({ modifiers: ["Shift"] });
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(3);
  await page
    .getByRole("button", { name: "Select loaded photos", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(photos[1].name);
  await expect(page.locator(".media-card")).toHaveCount(1);
  await expect(
    page.getByText("3 selected · 1 in use · 2 not shown", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(prefix);
  await page
    .getByRole("button", { name: "Delete selected (2)", exact: true })
    .click();
  let modal = page.getByRole("dialog", {
    name: /^Delete \d+ photos? permanently\?$/,
  });
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(deletes).toEqual([]);
  await page
    .getByRole("button", { name: "Delete selected (2)", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Delete selected photos", exact: true })
    .click();
  await expect(
    modal.getByText("Temporary deletion failure. Please retry.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(deletes).not.toContain(photos[0].id);
  await page.screenshot({
    path: testInfo.outputPath("bulk-delete-retry.png"),
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Retry remaining photos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".media-card")).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", {
      name: "Select " + photos[0].name,
      exact: true,
    }),
  ).toBeChecked();
  expect((await page.request.get("/api/media/" + photos[0].id)).status()).toBe(
    200,
  );
  expect((await page.request.get("/api/media/" + photos[1].id)).status()).toBe(
    404,
  );
  expect((await page.request.get("/api/media/" + photos[2].id)).status()).toBe(
    404,
  );
  await expect(
    page.getByRole("button", { name: "Delete selected", exact: true }),
  ).toBeDisabled();
  expect(deletes.filter((id) => id === photos[1].id)).toHaveLength(1);
  expect(deletes.filter((id) => id === photos[2].id)).toHaveLength(2);
});

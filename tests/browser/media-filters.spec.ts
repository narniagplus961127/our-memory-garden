import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import sharp from "sharp";
const env = parseEnv(readFileSync(".env.test", "utf8"));
test("filter photos by usage and event and group uploads on desktop and mobile", async ({
  page,
}) => {
  const headers = {
    Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
  };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const key = "Photo filters " + crypto.randomUUID().slice(0, 8);
  const image = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#769270" },
  })
    .png()
    .toBuffer();
  const photos = [];
  for (const name of [key + " Used.png", key + " Unused.png"]) {
    const upload = await (
      await page.request.post("/api/media/uploads", {
        headers,
        data: { name, size: image.length, type: "image/png" },
      })
    ).json();
    expect(
      (
        await page.request.put(upload.uploadUrl, {
          headers: { "Content-Type": "image/png" },
          data: image,
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
  const event = await (
    await page.request.post("/api/pages", { headers, data: { title: key } })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + event.id + "/details", {
        headers,
        data: {
          metadataVersion: event.metadata_version,
          date: null,
          coverPhotoId: photos[0].id,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/media");
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(key);
  await expect(page.locator(".media-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Photo usage" })
    .selectOption("unused");
  await expect(page.locator(".media-card strong")).toHaveText([photos[1].name]);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Filter photos by page or event" })
    .click();
  await page.getByRole("searchbox", { name: "Find page or event" }).fill(key);
  await page.getByRole("button", { name: key, exact: true }).click();
  await expect(page.locator(".media-card strong")).toHaveText([photos[0].name]);
  await page
    .getByRole("combobox", { name: "Group photos" })
    .selectOption("month");
  await expect(page.locator(".media-grid h3")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(2);
});
